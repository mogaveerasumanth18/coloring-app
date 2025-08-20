import * as React from 'react';

import IntegratedColoringBookApp from '@/components/IntegratedColoringBookApp';
import { FocusAwareStatusBar } from '@/components/ui';

export default function Style() {
  return (
    <>
      <FocusAwareStatusBar />
      <IntegratedColoringBookApp />
    </>
  );
}
