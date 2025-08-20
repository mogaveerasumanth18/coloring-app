import { useEffect } from 'react';

import IntegratedColoringBookApp from '../../components/IntegratedColoringBookApp';
import { PngTemplateService } from '../../services/PngTemplateService';

export default function Home() {
  useEffect(() => {
    // Initialize PNG Template Service when app starts
    PngTemplateService.initialize().catch((error) => {
      console.error('Failed to initialize PNG Template Service:', error);
    });
  }, []);

  return <IntegratedColoringBookApp compact />;
}
