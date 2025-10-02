// Real-time crack detection using computer vision techniques
// This implements edge detection and pattern recognition to identify cracks

export interface CrackDetection {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'longitudinal' | 'transverse' | 'diagonal' | 'network';
}

export interface DetectionResult {
  detections: CrackDetection[];
  processingTime: number;
  frameWidth: number;
  frameHeight: number;
}

class CrackDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Main detection function
  async detectCracks(imageSrc: string, width: number, height: number): Promise<DetectionResult> {
    const startTime = performance.now();
    
    // Load and process the image
    await this.loadImage(imageSrc, width, height);
    
    if (!this.imageData) {
      return { detections: [], processingTime: 0, frameWidth: width, frameHeight: height };
    }

    // Convert to grayscale
    const grayscale = this.toGrayscale(this.imageData);
    
    // Apply edge detection (Sobel operator)
    const edges = this.sobelEdgeDetection(grayscale, width, height);
    
    // Find crack patterns
    const crackRegions = this.findCrackRegions(edges, width, height);
    
    // Analyze and classify cracks
    const detections = this.analyzeCracks(crackRegions, width, height);
    
    const processingTime = performance.now() - startTime;
    
    return {
      detections,
      processingTime,
      frameWidth: width,
      frameHeight: height
    };
  }

  private async loadImage(imageSrc: string, width: number, height: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.drawImage(img, 0, 0, width, height);
        this.imageData = this.ctx.getImageData(0, 0, width, height);
        resolve();
      };
      img.src = imageSrc;
    });
  }

  private toGrayscale(imageData: ImageData): number[] {
    const data = imageData.data;
    const grayscale: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to grayscale using luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayscale.push(gray);
    }
    
    return grayscale;
  }

  private sobelEdgeDetection(grayscale: number[], width: number, height: number): number[] {
    const edges: number[] = new Array(grayscale.length).fill(0);
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = (y + ky) * width + (x + kx);
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += grayscale[pixelIndex] * sobelX[kernelIndex];
            gy += grayscale[pixelIndex] * sobelY[kernelIndex];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude;
      }
    }
    
    return edges;
  }

  private findCrackRegions(edges: number[], width: number, height: number): number[][] {
    const threshold = 50; // Edge threshold
    const regions: number[][] = [];
    const visited: boolean[] = new Array(edges.length).fill(false);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        if (!visited[index] && edges[index] > threshold) {
          const region = this.floodFill(edges, visited, x, y, width, height, threshold);
          if (region.length > 10) { // Minimum region size
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }

  private floodFill(edges: number[], visited: boolean[], startX: number, startY: number, 
                   width: number, height: number, threshold: number): number[] {
    const region: number[] = [];
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const index = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[index] || edges[index] <= threshold) {
        continue;
      }
      
      visited[index] = true;
      region.push(index);
      
      // Add neighboring pixels
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return region;
  }

  private analyzeCracks(regions: number[][], width: number, height: number): CrackDetection[] {
    const detections: CrackDetection[] = [];
    
    regions.forEach((region, index) => {
      if (region.length < 20) return; // Skip small regions
      
      // Calculate bounding box
      let minX = width, maxX = 0, minY = height, maxY = 0;
      
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
      
      const crackWidth = maxX - minX;
      const crackHeight = maxY - minY;
      const aspectRatio = crackWidth / crackHeight;
      
      // Determine crack type and severity
      let type: 'longitudinal' | 'transverse' | 'diagonal' | 'network';
      let severity: 'low' | 'medium' | 'high' | 'critical';
      
      if (aspectRatio > 3) {
        type = 'longitudinal';
        severity = crackWidth > 100 ? 'high' : crackWidth > 50 ? 'medium' : 'low';
      } else if (aspectRatio < 0.3) {
        type = 'transverse';
        severity = crackHeight > 80 ? 'high' : crackHeight > 40 ? 'medium' : 'low';
      } else if (region.length > 200) {
        type = 'network';
        severity = 'critical';
      } else {
        type = 'diagonal';
        severity = region.length > 100 ? 'high' : 'medium';
      }
      
      // Calculate confidence based on edge strength and region properties
      const confidence = Math.min(0.95, 0.3 + (region.length / 500) + (crackWidth * crackHeight / 10000));
      
      detections.push({
        id: index + 1,
        x: minX,
        y: minY,
        width: crackWidth,
        height: crackHeight,
        confidence: Math.round(confidence * 100) / 100,
        severity,
        type
      });
    });
    
    return detections;
  }
}

// Export singleton instance
export const crackDetector = new CrackDetector();

// Utility function for real-time detection
export async function detectCracksInFrame(
  imageSrc: string, 
  width: number, 
  height: number
): Promise<DetectionResult> {
  return crackDetector.detectCracks(imageSrc, width, height);
}
