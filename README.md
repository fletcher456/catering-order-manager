# Catering Order Manager

A React-based web application that parses restaurant menu PDFs and generates quantity-based catering orders with guest count calculations. The application runs entirely in the browser, making it perfect for static hosting on GitHub Pages.

## Features

- **PDF Menu Parsing**: Upload restaurant menu PDFs and automatically extract menu items with prices
- **Smart Categorization**: Automatically categorizes menu items (Appetizers, Mains, Sides, Desserts, Beverages)
- **Guest Count Calculator**: Set the number of guests and get recommended quantities for each item
- **Quantity Sliders**: Easily adjust quantities with intuitive controls
- **Cost Calculation**: Real-time total cost and per-guest cost calculations
- **Order Export**: Download, print, or email the complete catering order
- **Fully Static**: No server required - works entirely in the browser

## Technology Stack

- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **PDF.js**: Client-side PDF parsing (Mozilla's PDF.js library)
- **Lucide React**: Beautiful icons
- **Vite**: Fast build tool and development server

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd catering-order-manager
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for static hosting.

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

1. Push your code to the `main` or `master` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Your site will be available at `https://yourusername.github.io/repository-name`

**Note**: The GitHub Actions workflow has been configured to use direct Vite commands (`npx vite build --base ./`) to ensure compatibility with static hosting requirements.

### Manual Setup

1. Go to your repository's Settings → Pages
2. Select "Deploy from a branch" as the source
3. Choose the `gh-pages` branch
4. The deployment workflow is already configured in `.github/workflows/deploy.yml`

### GitHub Pages Configuration

Make sure to:
- Enable GitHub Pages in your repository settings
- Set the correct base URL in `vite.config.ts` if using a custom domain
- Ensure your repository is public (or you have GitHub Pro for private repos)

## How to Use

### 1. Upload Menu PDF
- Click the upload area or drag and drop a restaurant menu PDF
- Best results with PDFs exported from restaurant websites or digital menus
- The application will automatically extract menu items and prices

### 2. Set Guest Count
- Enter the number of guests for your event
- Click "Auto-fill Recommended" to get suggested quantities based on guest count

### 3. Adjust Quantities
- Use the quantity controls to adjust each menu item
- View real-time cost calculations per item and total
- Items are organized by category for easy browsing

### 4. Generate Order
- Review your selections in the order summary
- See total cost and cost per guest
- Generate the final catering order

### 5. Export Order
- Download as a text file
- Print the order summary
- Email to catering contacts
- Start a new order if needed

## Features in Detail

### PDF Parsing
- Supports various PDF menu formats
- Extracts item names, descriptions, and prices
- Handles multi-column layouts common in restaurant menus
- Automatic price detection with currency format support

### Smart Categorization
The application automatically categorizes menu items using keyword matching:
- **Appetizers**: wings, nachos, bruschetta, etc.
- **Mains**: chicken, beef, pasta, pizza, sandwiches
- **Sides**: fries, rice, vegetables
- **Desserts**: cake, ice cream, cookies
- **Beverages**: coffee, soda, wine, beer

### Quantity Recommendations
- Calculates serving recommendations based on guest count
- Considers serving sizes and typical consumption patterns
- Adjustable recommendations for different event types

### Cost Management
- Real-time price calculations
- Total order cost tracking
- Per-guest cost breakdown
- Price transparency for budget planning

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

The application uses modern web APIs including:
- File API for PDF uploads
- Canvas API for PDF rendering
- ES2020+ JavaScript features

## Privacy & Security

- **No data transmission**: All PDF processing happens in your browser
- **No server uploads**: PDFs never leave your device
- **No tracking**: No analytics or user tracking
- **Local processing**: Complete privacy protection

## Troubleshooting

### PDF Upload Issues
- Ensure the PDF is a valid restaurant menu with text (not just images)
- PDFs with embedded text work best
- Scanned PDFs may have limited accuracy

### Menu Parsing Problems
- Check that prices are in standard format ($12.99, 12.99)
- Ensure menu items follow typical restaurant formatting
- Try PDFs exported directly from restaurant websites

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 20+)
- Verify all dependencies are installed correctly

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork and create a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information about the problem

## Roadmap

Future enhancements may include:
- Support for more PDF formats
- Enhanced menu item detection
- Event type templates (corporate, wedding, casual)
- Integration with catering service APIs
- Multi-language support
- Custom branding options

---

Built with ❤️ for event planners and catering professionals