# Project Documentation

## Overview

A React-based catering order management system that parses restaurant menu PDFs and generates quantity-based orders with guest count calculations. The application runs entirely in the browser, making it perfect for static hosting on GitHub Pages.

## System Architecture

### Frontend-Only Architecture
- **React 18**: Modern UI framework with hooks for state management
- **TypeScript**: Type-safe development environment
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first styling framework

### Client-Side Processing
- **PDF.js**: Mozilla's PDF parsing library for client-side PDF text extraction
- **Browser APIs**: File API for uploads, Canvas API for PDF rendering
- **Local Storage**: No server-side data persistence required

## Key Components

### Core Application Components
- **App.tsx**: Main application component with state management for workflow
- **PDFUploader**: Handles PDF file uploads and parsing using PDF.js
- **CateringOrderForm**: Interactive form for guest count and quantity selection
- **OrderSummary**: Final order display with export capabilities

### Utility Modules
- **pdfParser.ts**: PDF text extraction and menu item parsing logic
- **types.ts**: TypeScript interfaces for MenuItem, CateringOrder, OrderItem

### UI Components
- Drag-and-drop file upload with visual feedback
- Quantity sliders with recommended values based on guest count
- Real-time cost calculations and category organization
- Export options (download, print, email)

## Data Flow

### PDF Processing Workflow
1. **Upload**: User selects PDF file via drag-drop or file picker
2. **Parse**: PDF.js extracts text content from all pages
3. **Extract**: Custom parser identifies menu items, prices, and descriptions
4. **Categorize**: Smart categorization based on keywords (Appetizers, Mains, etc.)
5. **Display**: Organized menu items presented to user

### Order Generation Flow
1. **Guest Count**: User sets number of guests
2. **Recommendations**: System calculates suggested quantities per item
3. **Customization**: User adjusts quantities using interactive controls
4. **Calculation**: Real-time total cost and per-guest cost updates
5. **Export**: Generate downloadable/printable order summary

## External Dependencies

### Production Dependencies
- **react**: ^18.3.1 - Core UI framework
- **react-dom**: ^18.3.1 - DOM rendering
- **pdfjs-dist**: ^4.8.69 - PDF parsing capabilities
- **lucide-react**: ^0.468.0 - Icon library
- **tailwindcss**: ^3.4.17 - CSS framework

### Development Dependencies
- **vite**: ^6.3.5 - Build tool and dev server
- **typescript**: ^5.7.2 - Type checking
- **@types/react**: ^18.3.17 - React type definitions
- **autoprefixer**: ^10.4.20 - CSS vendor prefixes

## Deployment Strategy

### GitHub Pages Deployment
- **Automatic CI/CD**: GitHub Actions workflow in `.github/workflows/deploy.yml`
- **Static Build**: Vite generates optimized static files in `dist/` directory
- **Base Configuration**: Relative paths for GitHub Pages compatibility

### Build Process
1. **Install**: Dependencies installation via npm
2. **Type Check**: TypeScript compilation
3. **Bundle**: Vite build with Rollup optimization
4. **Deploy**: Upload to GitHub Pages via Actions

### Hosting Requirements
- Static file hosting (GitHub Pages, Netlify, Vercel)
- HTTPS support for secure PDF.js worker loading
- Modern browser support (ES2020+)

## Changelog

- June 27, 2025: Initial project setup and development
- June 27, 2025: Complete React application with PDF parsing functionality
- June 27, 2025: GitHub Pages deployment configuration added
- June 27, 2025: Fixed GitHub Actions build error by updating workflow to use direct Vite commands
- June 27, 2025: Comprehensive documentation and README created

## Recent Issues Resolved

### GitHub Actions Build Fix
- **Issue**: GitHub Actions failing with "Missing script: build" error
- **Root Cause**: package.json missing build script, cannot be modified due to environment restrictions
- **Solution**: Updated `.github/workflows/deploy.yml` to use direct Vite commands:
  - `npx tsc --noEmit` for type checking
  - `npx vite build --base ./` for production build with correct GitHub Pages base path
- **Status**: ✓ Resolved - deployment workflow now functional

## User Preferences

Preferred communication style: Simple, everyday language.

## User Preferences

Preferred communication style: Simple, everyday language.

---

*Note: This documentation will be updated once the repository contents are available for analysis.*