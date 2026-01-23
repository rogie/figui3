# Contributing to FigUI3

Thank you for your interest in contributing to FigUI3! This document provides guidelines and instructions for contributing.

## Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When filing a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Browser and OS information
- Code samples or screenshots if applicable

## Suggesting Features

Feature requests are welcome! Please provide:

- A clear description of the feature
- Use cases and why it would be valuable
- Any implementation ideas you have

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/rogie/figui3.git
   cd figui3
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start the development server**
   ```bash
   bun dev
   ```
   This launches a local server at `http://localhost:3000` where you can view the component documentation and test changes.

4. **Build for production**
   ```bash
   bun build
   ```

## Code Style

- Use consistent indentation (2 spaces)
- Follow existing patterns in the codebase
- Add JSDoc comments for new components with `@attr` annotations
- Ensure components work in both light and dark themes
- Test keyboard navigation and accessibility

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with clear, descriptive commits
3. Test your changes across browsers (Chrome, Firefox, Safari)
4. Update documentation if adding new features or components
5. Submit a PR with a clear description of the changes

## Component Guidelines

When creating or modifying components:

- Extend `HTMLElement` and use standard Web Component patterns
- Implement `connectedCallback` and `disconnectedCallback` for proper cleanup
- Use `observedAttributes` and `attributeChangedCallback` for reactive attributes
- Emit `input` events during interaction and `change` events on commit
- Support the `disabled` attribute where appropriate
- Include ARIA attributes for accessibility
- Use CSS custom properties for theming compatibility

## Questions?

Feel free to open an issue for any questions about contributing.
