# Project Architecture Template

This document serves as a template guide for creating React Native (Expo) applications with a robust, maintainable architecture. It outlines the key patterns and structures used in this project that can be replicated for future applications.

## Project Structure

```
/app                     # Main application routes and layouts
  /(tabs)                # Tab-based navigation
  _layout.tsx            # Root layout configuration
  index.tsx              # Entry point
/components              # Reusable UI components
  /ui                    # Platform-specific UI components
  __tests__              # Component tests
/constants               # App-wide constants and themes
/contexts                # React Context providers
/hooks                   # Custom React hooks
/assets                  # Static assets (images, fonts)
```

## Navigation Architecture

### Root Layout (`app/_layout.tsx`)
- Handles theme provider setup
- Manages global context providers
- Configures stack navigation
- Handles font loading and splash screen

### Tab Navigation (`app/(tabs)/_layout.tsx`)
- Implements bottom tab navigation
- Configures tab styling and icons
- Handles platform-specific UI adjustments

## Context Management

### Class Context Example (`contexts/ClassContext.tsx`)
```typescript
// Pattern for creating context providers:
1. Define types for context data
2. Create initial mock data if needed
3. Create context with undefined initial value
4. Create provider component with state management
5. Create custom hook for accessing context
```

Key features:
- Type-safe context creation
- Centralized state management
- Custom hooks for context access
- Programmatic navigation integration

## Component Architecture

### Interactive Components

#### Collapsible Components
- Implements expandable/collapsible sections
- Uses animated transitions
- Maintains consistent theming
- Handles state internally

#### Parallax Scroll Views
- Implements smooth parallax effects
- Handles header image animations
- Supports dynamic content loading
- Integrates with tab navigation

### Themed Components
- Consistent theming system
- Dark/Light mode support
- Custom hooks for theme colors
- Platform-specific styling variants

## State Management Patterns

### Study Guide Management
- Type-safe data structures
- Mock data integration
- Context-based state handling
- Navigation-aware state updates

### Audio Content Integration
- Structured audio file management
- Timestamp integration
- Progress tracking
- State persistence

## Routing Patterns

### File-based Routing
- Uses Expo Router for file-based routing
- Nested navigation structure:
  - `/(tabs)` for main navigation
  - Individual route groups for features

### Navigation Best Practices
- Type-safe navigation
- Consistent layout handling
- Modal presentation options
- Deep linking support

## Development Guidelines

### State Management
1. Use context for global state
2. Keep state close to where it's used
3. Implement proper type definitions
4. Use custom hooks for complex logic

### Component Organization
1. Group related components
2. Implement platform-specific variants
3. Include test files
4. Use TypeScript for type safety

### Styling Approach
1. Centralized color schemes
2. Theme-aware components
3. Platform-specific styling when needed
4. Consistent spacing and typography

## Getting Started

1. Clone this template
2. Update app configuration
3. Implement required context providers
4. Add necessary route groups
5. Create needed UI components

## Best Practices

1. **Type Safety**
   - Use TypeScript consistently
   - Define interfaces for all props
   - Implement proper type guards

2. **State Management**
   - Use context for global state
   - Implement proper provider patterns
   - Create custom hooks for state access

3. **Navigation**
   - Follow file-based routing conventions
   - Implement proper type definitions
   - Use consistent navigation patterns

4. **Component Design**
   - Create reusable components
   - Implement proper theming
   - Handle platform differences

5. **Code Organization**
   - Follow folder structure
   - Group related functionality
   - Maintain separation of concerns

## AI-Friendly Implementation Notes

### Component Structure
- Use clear, descriptive component names
- Implement consistent prop interfaces
- Document component usage patterns
- Maintain predictable file structure

### State Management
- Use typed context providers
- Implement clear state update patterns
- Document state flow and dependencies
- Use consistent naming conventions

### UI Patterns
- Document reusable UI components
- Maintain consistent styling patterns
- Use semantic component names
- Document theme implementation

This template provides a solid foundation for building scalable, maintainable React Native applications with Expo.


--------------

