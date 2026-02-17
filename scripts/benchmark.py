#!/usr/bin/env python3
"""Benchmark mlstx minimap2 approach against Seemann's mlst CLI.

Validates that our minimap2-based allele calling produces the same
sequence types as the gold-standard mlst tool.

Usage:
    pixi run python scripts/benchmark.py
    pixi run python scripts/benchmark.py --input-dir test_data --scheme salmonella
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

# Thresholds matching callAllele.ts
IDENTITY_THRESHOLD = 0.90
COVERAGE_THRESHOLD = 0.90


def scan_genomes(directory: Path) -> list[Path]:
    """Find all FASTA genome files in a directory."""
    extensions = ("*.fasta", "*.fasta.gz", "*.fa", "*.fa.gz", "*.fna", "*.fna.gz")
    files = []
    for ext in extensions:
        files.extend(directory.glob(ext))
    return sorted(files)


def run_mlst_cli(genomes: list[Path], scheme: str | None = None) -> dict[str, dict]:
    """Run Seemann's mlst CLI and parse results.

    Returns dict of {filename: {scheme, st, alleles: {locus: allele}}}.
    """
    cmd = ["mlst"] + [str(g) for g in genomes]
    if scheme:
        cmd.extend(["--scheme", scheme])

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    results = {}

    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) < 3:
            continue

        filepath = fields[0]
        filename = Path(filepath).name
        mlst_scheme = fields[1]
        st = fields[2]

        # Remaining fields are allele calls like "aroC(1)" or "aroC(~1)"
        alleles = {}
        for allele_field in fields[3:]:
            if "(" in allele_field:
                locus = allele_field.split("(")[0]
                value = allele_field.split("(")[1].rstrip(")")
                # ~ prefix indicates approximate match
                if value.startswith("~"):
                    value = "novel"
                elif value == "-":
                    value = "no_hit"
                alleles[locus] = value
            elif allele_field == "-":
                pass  # missing locus

        results[filename] = {"scheme": mlst_scheme, "st": st, "alleles": alleles}

    return results


def parse_fasta(text: str) -> dict[str, str]:
    """Parse FASTA text into {name: sequence} dict."""
    sequences = {}
    current_name = ""
    current_seq: list[str] = []

    for line in text.split("\n"):
        line = line.strip()
        if line.startswith(">"):
            if current_name:
                sequences[current_name] = "".join(current_seq)
            current_name = line[1:].split()[0]
            current_seq = []
        elif line and current_name:
            current_seq.append(line.upper())

    if current_name:
        sequences[current_name] = "".join(current_seq)

    return sequences


def load_scheme(db_dir: Path, scheme: str) -> tuple[list[str], list[dict], dict[str, int]]:
    """Load scheme data from the local database.

    Returns (loci, profiles, allele_lengths).
    """
    scheme_dir = db_dir / scheme
    scheme_json = json.loads((scheme_dir / "scheme.json").read_text())
    profiles = json.loads((scheme_dir / "profiles.json").read_text())
    loci = scheme_json["loci"]

    allele_lengths: dict[str, int] = {}
    for locus in loci:
        fasta_path = scheme_dir / f"{locus}.fasta"
        if fasta_path.exists():
            seqs = parse_fasta(fasta_path.read_text())
            for name, seq in seqs.items():
                allele_lengths[name] = len(seq)

    return loci, profiles, allele_lengths


def concat_alleles(db_dir: Path, scheme: str, loci: list[str]) -> str:
    """Concatenate all locus FASTA files into a single string."""
    parts = []
    for locus in loci:
        fasta_path = db_dir / scheme / f"{locus}.fasta"
        if fasta_path.exists():
            parts.append(fasta_path.read_text())
    return "\n".join(parts)


def run_minimap2(genome_path: Path, alleles_path: Path) -> str:
    """Run minimap2 and return PAF output."""
    # minimap2 -c: base-level alignment for accurate identity
    # genome is target (first arg), alleles is query (second arg)
    # minimap2 handles .fasta.gz natively
    cmd = ["minimap2", "-c", str(genome_path), str(alleles_path)]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout


def parse_paf(paf_text: str) -> list[dict]:
    """Parse PAF output into hit records.

    Matches the parsePAF function in align.ts.
    """
    hits = []
    for line in paf_text.strip().split("\n"):
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) < 12:
            continue

        try:
            q_name = fields[0]   # allele name
            q_len = int(fields[1])
            q_start = int(fields[2])
            q_end = int(fields[3])
            t_name = fields[5]   # genome name
            t_start = int(fields[7])
            t_end = int(fields[8])
            n_match = int(fields[9])
            block_len = int(fields[10])
        except (ValueError, IndexError):
            continue

        if block_len == 0:
            continue

        identity = (n_match / block_len) * 100  # percentage

        hits.append({
            "target_name": q_name,   # allele name (matches callAllele convention)
            "query_name": t_name,    # genome name
            "identity": identity,
            "alignment_length": q_end - q_start,
            "target_start": q_start,
            "target_end": q_end,
            "query_start": t_start,
            "query_end": t_end,
            "target_length": q_len,  # allele full length
        })

    return hits


def call_allele(
    locus: str,
    hits: list[dict],
    allele_lengths: dict[str, int],
) -> dict:
    """Call the best allele for a locus.

    Matches callAllele.ts logic exactly.
    """
    if not hits:
        return {"locus": locus, "allele": "no_hit", "identity": 0, "coverage": 0}

    best_hit = None
    best_identity = 0.0
    best_coverage = 0.0

    for hit in hits:
        allele_len = allele_lengths.get(hit["target_name"], hit["target_length"])
        if allele_len == 0:
            continue

        identity = hit["identity"] / 100  # fraction
        coverage = hit["alignment_length"] / allele_len

        if identity > best_identity or (
            identity == best_identity and coverage > best_coverage
        ):
            best_identity = identity
            best_coverage = coverage
            best_hit = hit

    if best_hit is None:
        return {"locus": locus, "allele": "no_hit", "identity": 0, "coverage": 0}

    if best_identity < IDENTITY_THRESHOLD or best_coverage < COVERAGE_THRESHOLD:
        return {
            "locus": locus,
            "allele": "no_hit",
            "identity": best_identity,
            "coverage": best_coverage,
        }

    if best_identity == 1.0 and best_coverage >= 1.0:
        # Exact match — extract allele number
        parts = best_hit["target_name"].split("_")
        allele_num = parts[-1]
        return {
            "locus": locus,
            "allele": allele_num,
            "identity": best_identity,
            "coverage": best_coverage,
        }

    # Above threshold but not exact
    return {
        "locus": locus,
        "allele": "novel",
        "identity": best_identity,
        "coverage": best_coverage,
    }


def call_st(allele_calls: list[dict], profiles: list[dict]) -> str:
    """Look up ST from allele calls. Matches callST.ts logic."""
    alleles = {ac["locus"]: ac["allele"] for ac in allele_calls}

    if any(a == "no_hit" for a in alleles.values()):
        return "incomplete"

    if any(a == "novel" for a in alleles.values()):
        return "novel"

    # All exact — look up in profiles
    for profile in profiles:
        match = True
        for locus, allele in alleles.items():
            if profile["alleles"].get(locus) != allele:
                match = False
                break
        if match:
            return profile["st"]

    return "novel"


def run_minimap2_mlst(
    genome_path: Path,
    db_dir: Path,
    scheme: str,
    loci: list[str],
    profiles: list[dict],
    allele_lengths: dict[str, int],
    alleles_file: Path,
) -> dict:
    """Run minimap2-based MLST on a single genome."""
    paf_text = run_minimap2(genome_path, alleles_file)
    all_hits = parse_paf(paf_text)

    allele_calls = []
    for locus in loci:
        prefix = f"{locus}_"
        locus_hits = [h for h in all_hits if h["target_name"].startswith(prefix)]
        allele_calls.append(call_allele(locus, locus_hits, allele_lengths))

    st = call_st(allele_calls, profiles)
    alleles = {ac["locus"]: ac["allele"] for ac in allele_calls}

    return {"scheme": scheme, "st": st, "alleles": alleles}


def main():
    parser = argparse.ArgumentParser(
        description="Benchmark mlstx minimap2 approach against mlst CLI"
    )
    parser.add_argument(
        "--input-dir",
        default="test_data",
        help="Directory containing genome FASTA files (default: test_data)",
    )
    parser.add_argument(
        "--db-dir",
        default="public/db",
        help="Directory containing MLST scheme databases (default: public/db)",
    )
    parser.add_argument(
        "--scheme",
        default="salmonella",
        help="MLST scheme to use (default: salmonella)",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    db_dir = Path(args.db_dir)
    scheme = args.scheme

    # Scan for genomes
    genomes = scan_genomes(input_dir)
    if not genomes:
        print(f"No genome files found in {input_dir}")
        sys.exit(1)

    print(f"Found {len(genomes)} genome(s) in {input_dir}")
    print(f"Scheme: {scheme}")
    print()

    # Load scheme data
    loci, profiles, allele_lengths = load_scheme(db_dir, scheme)
    print(f"Loaded scheme with {len(loci)} loci: {', '.join(loci)}")
    print(f"Profiles: {len(profiles)}")
    print()

    # Create temporary concatenated alleles file
    alleles_text = concat_alleles(db_dir, scheme, loci)
    alleles_tmpfile = tempfile.NamedTemporaryFile(
        mode="w", suffix=".fasta", delete=False
    )
    alleles_tmpfile.write(alleles_text)
    alleles_tmpfile.close()
    alleles_path = Path(alleles_tmpfile.name)

    try:
        # Run mlst CLI
        print("Running mlst CLI...")
        mlst_results = run_mlst_cli(genomes, scheme)

        # Run minimap2-based MLST
        print("Running minimap2-based MLST...")
        mm2_results = {}
        for genome in genomes:
            filename = genome.name
            result = run_minimap2_mlst(
                genome, db_dir, scheme, loci, profiles, allele_lengths, alleles_path
            )
            mm2_results[filename] = result

        # Compare results
        print()
        print("=" * 80)
        print(f"{'Genome':<40} {'mlst ST':<10} {'mm2 ST':<10} {'Match'}")
        print("=" * 80)

        matches = 0
        mismatches = 0

        for genome in genomes:
            filename = genome.name
            mlst_st = mlst_results.get(filename, {}).get("st", "N/A")
            mm2_st = mm2_results.get(filename, {}).get("st", "N/A")
            match = mlst_st == mm2_st
            marker = "OK" if match else "MISMATCH"

            if match:
                matches += 1
            else:
                mismatches += 1

            display_name = filename[:38] if len(filename) > 38 else filename
            print(f"{display_name:<40} {mlst_st:<10} {mm2_st:<10} {marker}")

            # Show allele-level differences on mismatch
            if not match:
                mlst_alleles = mlst_results.get(filename, {}).get("alleles", {})
                mm2_alleles = mm2_results.get(filename, {}).get("alleles", {})
                for locus in loci:
                    ma = mlst_alleles.get(locus, "?")
                    m2a = mm2_alleles.get(locus, "?")
                    diff = " <--" if ma != m2a else ""
                    print(f"    {locus}: mlst={ma} mm2={m2a}{diff}")

        print("=" * 80)
        print(f"Total: {matches + mismatches} | Matches: {matches} | Mismatches: {mismatches}")

        if mismatches > 0:
            print("\nWARNING: Some results differ between mlst and minimap2")
            sys.exit(1)
        else:
            print("\nAll results match!")
            sys.exit(0)

    finally:
        alleles_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
