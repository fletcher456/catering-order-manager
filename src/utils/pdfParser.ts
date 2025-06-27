import * as pdfjsLib from 'pdfjs-dist';
import { MenuItem } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MenuPDFParser {
  async extractMenuFromPDF(file: File): Promise<MenuItem[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let allText = '';
      let textItems: TextItem[] = [];
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Preserve spatial information for better parsing
        const pageItems = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        }));
        
        textItems.push(...pageItems);
        allText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      
      return this.parseMenuItems(allText, textItems);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF. Please ensure it\'s a valid PDF file.');
    }
  }
  
  private parseMenuItems(text: string, _textItems: TextItem[]): MenuItem[] {
    const menuItems: MenuItem[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Try multiple patterns for menu items
      const patterns = [
        // Pattern 1: "Item Name $12.99" or "Item Name 12.99"
        /^(.+?)\s+\$?(\d+\.?\d*)\s*$/,
        // Pattern 2: "Item Name - Description $12.99"
        /^(.+?)\s*-\s*(.+?)\s+\$?(\d+\.?\d*)\s*$/,
        // Pattern 3: Price at beginning "$12.99 Item Name"
        /^\$?(\d+\.?\d*)\s+(.+)$/,
        // Pattern 4: Multi-line with price on next line
        /^(.{10,})\s*$/
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          let name = '';
          let price = 0;
          let description = '';
          
          if (pattern === patterns[0]) {
            // Simple name + price
            name = match[1].trim();
            price = parseFloat(match[2]);
          } else if (pattern === patterns[1]) {
            // Name + description + price
            name = match[1].trim();
            description = match[2].trim();
            price = parseFloat(match[3]);
          } else if (pattern === patterns[2]) {
            // Price + name
            price = parseFloat(match[1]);
            name = match[2].trim();
          } else if (pattern === patterns[3]) {
            // Check next line for price
            name = match[1].trim();
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              const priceMatch = nextLine.match(/^\$?(\d+\.?\d*)\s*$/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1]);
                i++; // Skip next line as we processed it
              }
            }
          }
          
          if (name && price > 0) {
            const category = this.categorizeItem(name, description);
            const servingSize = this.estimateServingSize(name, description);
            
            menuItems.push({
              id: `item-${menuItems.length + 1}`,
              name: this.cleanItemName(name),
              price,
              description: description || undefined,
              category,
              servingSize
            });
            break;
          }
        }
      }
    }
    
    return this.deduplicateItems(menuItems);
  }
  
  private categorizeItem(name: string, description: string): string {
    const text = (name + ' ' + description).toLowerCase();
    
    const categories = {
      'Appetizers': ['appetizer', 'starter', 'wings', 'nachos', 'dip', 'bread', 'bruschetta', 'calamari'],
      'Salads': ['salad', 'caesar', 'greens', 'lettuce'],
      'Soups': ['soup', 'bisque', 'chowder', 'broth'],
      'Mains': ['entree', 'main', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'steak', 'pasta', 'pizza', 'burger', 'sandwich'],
      'Sides': ['side', 'fries', 'rice', 'potato', 'vegetable', 'beans'],
      'Desserts': ['dessert', 'cake', 'pie', 'ice cream', 'chocolate', 'cookie', 'tiramisu'],
      'Beverages': ['drink', 'coffee', 'tea', 'soda', 'juice', 'beer', 'wine', 'cocktail', 'water']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }
  
  private estimateServingSize(name: string, description: string): number {
    const text = (name + ' ' + description).toLowerCase();
    
    // Look for serving size indicators
    if (text.includes('family') || text.includes('large')) return 4;
    if (text.includes('sharing') || text.includes('platter')) return 6;
    if (text.includes('individual') || text.includes('personal')) return 1;
    if (text.includes('pizza') && text.includes('large')) return 4;
    if (text.includes('pizza') && text.includes('medium')) return 3;
    if (text.includes('pizza') && text.includes('small')) return 2;
    
    // Default serving size based on category
    const category = this.categorizeItem(name, description);
    switch (category) {
      case 'Appetizers': return 2;
      case 'Salads': return 1;
      case 'Soups': return 1;
      case 'Mains': return 1;
      case 'Sides': return 2;
      case 'Desserts': return 1;
      case 'Beverages': return 1;
      default: return 1;
    }
  }
  
  private cleanItemName(name: string): string {
    // Remove common prefixes and suffixes
    return name
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/\s*\.\.\.*\s*$/, '') // Remove trailing dots
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  private deduplicateItems(items: MenuItem[]): MenuItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.name.toLowerCase() + item.price;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}