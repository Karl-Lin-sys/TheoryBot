declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  isGenerating?: boolean;
  visualization?: VisualizationData;
  imageUrl?: string;
  imageGenerating?: boolean;
};

export type VisualizationData = {
  type: 'scale' | 'chord';
  root: string;
  name: string;
  notes: string[];
  instrument: 'piano' | 'guitar';
};
