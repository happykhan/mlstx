# Contributing to mlstx

Thanks for your interest in contributing! Here's how to get started.

## Development setup

```bash
git clone https://github.com/happykhan/mlstx.git
cd mlstx
npm install
npm run dev
```

## Running checks

```bash
npm test          # unit tests
npm run lint      # eslint
npm run build     # type check + production build
```

## Adding a new MLST scheme

1. Run `npm run fetch-db -- <scheme_name>` to download from PubMLST
2. Verify the scheme appears in `public/db/schemes.json`
3. Test with a known genome to confirm correct ST assignment

## Pull request process

1. Fork the repository and create a branch from `main`
2. Make your changes and add tests if applicable
3. Ensure all checks pass: `npm test && npm run lint && npm run build`
4. Open a pull request with a clear description of the change

## Reporting bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser and OS version
- The genome file (or a minimal example) if relevant

## Code style

- TypeScript strict mode is enforced
- ESLint rules are configured — run `npm run lint` before committing
- Keep functions small and well-named; avoid unnecessary abstractions

## License

By contributing, you agree that your contributions will be licensed under the [GPLv3](LICENSE).
