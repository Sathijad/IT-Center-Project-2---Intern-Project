# VS Code/Cursor TypeScript Configuration

This directory contains VS Code/Cursor settings to properly configure TypeScript for test files.

## What's Configured

- **TypeScript SDK**: Uses workspace TypeScript version
- **File Associations**: Test files are properly recognized as TypeScript/TSX
- **TypeScript Validation**: Enabled for better error detection

## After Setup

**IMPORTANT**: You need to restart the TypeScript language server for the changes to take effect:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

This will reload the TypeScript configuration and should resolve the Jest type errors in test files.

## Files

- `settings.json` - VS Code/Cursor workspace settings for TypeScript configuration

