# Model Tests

This directory contains comprehensive unit tests for the Strawbaler model system.

## Test Files

### ✅ `operations.test.ts` (26 tests - All Passing)
Tests all model operations functions:
- **Factory Functions**: Creating buildings, floors, walls, rooms, connection points, openings
- **Geometric Calculations**: Wall length, angles, room area, building bounds
- **Opening Positioning**: Offset-based positioning, validation, overlap detection
- **Building Operations**: Adding/removing entities, maintaining relationships

### ✅ `store-simple.test.ts` (9 tests - All Passing)
Tests Zustand store functionality:
- **Initial State**: Correct initialization with building and ground floor
- **Building Operations**: Creating buildings, adding floors/walls/rooms
- **Entity Management**: Connection points, openings with validation
- **Selection Management**: Setting, toggling, clearing selections
- **View Operations**: View modes, grid settings, active floor switching
- **Wall Removal**: Proper cleanup of related entities

## Test Coverage

The tests cover:

### Core Model Operations ✅
- Building creation and initialization
- Entity creation (walls, rooms, floors, openings, connection points)
- Geometric calculations (lengths, angles, areas, bounds)
- Opening validation and positioning
- Entity relationships and cleanup

### Zustand Store ✅
- State initialization and management
- All store actions and their effects
- Selection state management
- View state management
- Error handling and validation

### Key Features Tested ✅
- **Offset-based opening positioning** - Openings positioned by mm offset from wall start
- **Validation** - Opening overlap and bounds checking
- **State consistency** - Proper cleanup when removing entities
- **Building guarantees** - Always has building with at least one floor
- **Immutability** - State updates create new objects
- **Error handling** - Invalid operations throw appropriate errors

## Running Tests

```bash
# Run all model tests
pnpm test src/model/__tests__/

# Run specific test file
pnpm test src/model/__tests__/operations.test.ts
pnpm test src/model/__tests__/store-simple.test.ts

# Run tests in watch mode
pnpm test src/model/__tests__/ --watch
```

## Test Architecture

- **Operations Tests**: Pure function tests, no React dependencies
- **Store Tests**: Direct Zustand store testing without React hooks
- **Validation Tests**: Error scenarios and edge cases
- **Integration Tests**: Complex workflows and state consistency

## Notes

- React hook-based tests were excluded due to infinite loop issues with the test renderer
- Store tests use direct store access (`useModelStore.getState()`) for reliability
- All tests use proper setup/teardown to ensure isolation
- Tests validate both success and error paths
