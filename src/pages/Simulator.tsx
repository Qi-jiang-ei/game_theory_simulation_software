import React from 'react';
import { ModelSelector } from '../components/ModelSelector';
import { SimulationControls } from '../components/SimulationControls';

export const Simulator: React.FC = () => {
  return (
    <div className="grid gap-6">
      <ModelSelector />
      <SimulationControls />
    </div>
  );
};

// 添加默认导出
export default Simulator;
