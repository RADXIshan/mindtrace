# Contributing to MindTrace

First off, thank you for considering contributing to MindTrace! 🎉

MindTrace is built to help people with memory challenges live more independently. Every contribution helps make this mission a reality.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and inclusive in all interactions.

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10-3.12
- **uv** (Python package manager)
- **Git**

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mindtrace.git
   cd mindtrace
   ```

3. **Set up the server:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your API keys
   uv sync
   ```

4. **Set up the clients:**
   ```bash
   cd ../client
   cp .env.example .env
   npm install

   cd ../glass-client
   cp .env.example .env
   npm install
   ```

5. **Start development servers:**
   ```bash
   # Terminal 1 - Server
   cd server && uv run main.py

   # Terminal 2 - Dashboard
   cd client && npm run dev

   # Terminal 3 - Glass Client (optional)
   cd glass-client && npm run dev
   ```

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues. When creating a report, include:

- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Python/Node versions)

### Suggesting Features

Feature suggestions are welcome! Please:

- Check if it's already suggested
- Describe the problem it solves
- Provide use case examples
- Consider implementation complexity

### Contributing Code

1. **Find an issue** to work on or create one
2. **Comment** on the issue to claim it
3. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```
4. **Make your changes** following our style guidelines
5. **Test your changes** thoroughly
6. **Commit** with clear messages
7. **Push** and create a Pull Request

## Pull Request Process

1. **Update documentation** if you change any APIs or features
2. **Add tests** for new functionality when possible
3. **Run linting** before submitting:
   ```bash
   # Python
   cd server && ruff check .
   
   # JavaScript
   cd client && npm run lint
   cd glass-client && npm run lint
   ```
4. **Fill out the PR template** completely
5. **Request review** from maintainers
6. **Address feedback** promptly

### PR Title Format

Use conventional commit format:
- `feat: Add new face recognition model option`
- `fix: Resolve WebSocket disconnection issue`
- `docs: Update installation instructions`
- `refactor: Simplify reminder scheduling logic`
- `style: Fix linting errors in contactRoutes`

## Style Guidelines

### Python (Server)

- Follow **PEP 8** conventions
- Use **type hints** for function parameters and returns
- Write **docstrings** for public functions/classes
- Keep functions focused and under 50 lines when possible

```python
def recognize_face(image: np.ndarray, threshold: float = 0.45) -> List[Dict[str, Any]]:
    """
    Recognize faces in an image.
    
    Args:
        image: OpenCV image in BGR format
        threshold: Confidence threshold for recognition
        
    Returns:
        List of recognition results with name, confidence, and bbox
    """
    ...
```

### JavaScript/React

- Use **functional components** with hooks
- Follow **ESLint** configuration provided
- Use **descriptive variable names**
- Prefer **const** over let when possible

```jsx
// Good
const ContactCard = ({ contact, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleEditClick = useCallback(() => {
    onEdit(contact.id);
  }, [contact.id, onEdit]);
  
  return (
    // ...
  );
};
```

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues when applicable

```
feat: Add medication reminder notifications

- Implement push notification system
- Add notification preferences to settings
- Create reminder scheduler background task

Closes #123
```

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` - these are great starting points!

### High-Impact Areas

- **Face Recognition**: Improve accuracy, add new models
- **Speech-to-Text**: Multi-language support, noise reduction
- **Mobile Apps**: React Native or Flutter companion apps
- **Accessibility**: Screen reader support, voice commands
- **Testing**: We need more test coverage!

### Documentation

- Improve README and guides
- Add code comments
- Create video tutorials
- Translate documentation

## Community

- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Use for bugs and feature requests

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions

---

Thank you for contributing to MindTrace! Together, we're building technology that helps people remember what matters most. 🧠✨
