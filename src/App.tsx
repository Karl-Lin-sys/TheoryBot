import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Send, Music, Image as ImageIcon, Settings, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { toast, Toaster } from 'sonner';

import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { ScrollArea } from './components/ui/scroll-area';

import { PianoKeyboard } from './components/PianoKeyboard';
import { GuitarFretboard } from './components/GuitarFretboard';
import { Message, VisualizationData } from './types';

const MODELS = {
  pro: 'gemini-3.1-pro-preview',
  flash: 'gemini-3-flash-preview',
  lite: 'gemini-3.1-flash-lite-preview',
};

const IMAGE_MODEL = 'gemini-3-pro-image-preview';

const visualizeMusicTheoryDeclaration: FunctionDeclaration = {
  name: "visualizeMusicTheory",
  description: "Visualize a musical scale or chord on a piano keyboard or guitar fretboard.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "Whether it's a 'scale' or 'chord'" },
      root: { type: Type.STRING, description: "The root note, e.g., 'C', 'F#'" },
      name: { type: Type.STRING, description: "The name of the scale or chord, e.g., 'Major', 'Minor 7th'" },
      notes: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "The notes in the scale or chord, e.g., ['C', 'E', 'G']"
      },
      instrument: { type: Type.STRING, description: "'piano' or 'guitar'" }
    },
    required: ["type", "root", "name", "notes", "instrument"]
  }
};

const generateImageDeclaration: FunctionDeclaration = {
  name: "generateImage",
  description: "Generate a high-quality image based on a prompt. Use this when the user asks for a picture, poster, or image.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "The detailed prompt for the image generation." }
    },
    required: ["prompt"]
  }
};

const SYSTEM_INSTRUCTION = `You are a music theory expert and visualizer. 
Your goal is to help users understand music theory concepts like scales and chords.
When a user asks about a scale or chord, explain it briefly and ALWAYS call the 'visualizeMusicTheory' function to show it to them on a piano or guitar (default to piano unless they specify guitar).
When a user asks to generate an image or poster, ALWAYS call the 'generateImage' function with a detailed prompt.
Be concise, friendly, and educational.`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(MODELS.flash);
  const [imageSize, setImageSize] = useState<string>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Chat session ref to maintain history
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("GEMINI_API_KEY is not set.");
      return null;
    }
    const ai = new GoogleGenAI({ apiKey });
    return ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [visualizeMusicTheoryDeclaration, generateImageDeclaration] }],
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      if (!chatRef.current || chatRef.current.model !== model) {
        chatRef.current = await initChat();
      }

      if (!chatRef.current) return;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const responseMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: '', isGenerating: true };
      setMessages(prev => [...prev, responseMessage]);

      const response = await chatRef.current.sendMessage({ message: userMessage.text });
      
      let finalMessage = response.text || '';
      let visualization: VisualizationData | undefined;
      let imageUrl: string | undefined;

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'visualizeMusicTheory') {
            visualization = call.args as VisualizationData;
            finalMessage += `\n\n*Visualizing ${visualization.root} ${visualization.name} ${visualization.type} on ${visualization.instrument}...*`;
          } else if (call.name === 'generateImage') {
            const prompt = call.args.prompt as string;
            finalMessage += `\n\n*Generating image: "${prompt}" at ${imageSize} resolution...*`;
            
            // Update message to show generating state
            setMessages(prev => prev.map(m => m.id === responseMessage.id ? { ...m, text: finalMessage, imageGenerating: true } : m));
            
            // Handle image generation
            if (!(await window.aistudio.hasSelectedApiKey())) {
              await window.aistudio.openSelectKey();
            }
            
            // Re-initialize GenAI with potentially new key
            const imageAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY! });
            
            try {
              const imageResponse = await imageAi.models.generateContent({
                model: IMAGE_MODEL,
                contents: { parts: [{ text: prompt }] },
                config: {
                  imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: imageSize as any
                  }
                }
              });
              
              for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
              }
            } catch (imgErr: any) {
              console.error("Image generation failed:", imgErr);
              toast.error("Image generation failed: " + imgErr.message);
              finalMessage += "\n\n*(Image generation failed)*";
            }
          }
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === responseMessage.id 
          ? { ...m, text: finalMessage, isGenerating: false, visualization, imageUrl, imageGenerating: false } 
          : m
      ));

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred");
      setMessages(prev => prev.map(m => m.isGenerating ? { ...m, text: "Sorry, an error occurred.", isGenerating: false } : m));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="top-center" />
      
      {/* Left Panel: Chat */}
      <div className="w-1/3 min-w-[350px] border-r border-slate-200 bg-white flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Music className="w-6 h-6" />
            <h1 className="font-bold text-lg tracking-tight">TheoryBot</h1>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MODELS.lite}>Flash Lite (Fast)</SelectItem>
                  <SelectItem value={MODELS.flash}>Flash (Balanced)</SelectItem>
                  <SelectItem value={MODELS.pro}>Pro (Complex)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Image Size</label>
              <Select value={imageSize} onValueChange={setImageSize}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K</SelectItem>
                  <SelectItem value="2K">2K</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-10 text-sm">
                Ask me about scales, chords, or to generate music theory posters!
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                  {msg.isGenerating && <Loader2 className="w-4 h-4 animate-spin mt-2 opacity-50" />}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              placeholder="E.g., Show me a C Major scale on guitar..."
              className="flex-1"
              disabled={isGenerating}
            />
            <Button type="submit" disabled={isGenerating || !input.trim()} size="icon" className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Right Panel: Visualization */}
      <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex flex-col items-center justify-start gap-8">
        {messages.filter(m => m.visualization || m.imageUrl || m.imageGenerating).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
            <Music className="w-24 h-24 mb-4" />
            <p className="text-lg font-medium">Visualizations will appear here</p>
          </div>
        ) : (
          messages.map(msg => (
            <React.Fragment key={`vis-${msg.id}`}>
              {msg.visualization && (
                <Card className="w-full max-w-4xl shadow-md border-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                  <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Music className="w-5 h-5 text-indigo-500" />
                      {msg.visualization.root} {msg.visualization.name} {msg.visualization.type}
                    </CardTitle>
                    <p className="text-sm text-slate-500 font-mono mt-1">
                      Notes: {msg.visualization.notes.join(' - ')}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 bg-slate-50">
                    {msg.visualization.instrument === 'piano' ? (
                      <PianoKeyboard activeNotes={msg.visualization.notes} />
                    ) : (
                      <GuitarFretboard activeNotes={msg.visualization.notes} />
                    )}
                  </CardContent>
                </Card>
              )}
              
              {msg.imageGenerating && !msg.imageUrl && (
                <Card className="w-full max-w-4xl shadow-md border-0 overflow-hidden animate-in fade-in">
                  <CardContent className="p-12 flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                    <p>Generating high-quality image...</p>
                  </CardContent>
                </Card>
              )}

              {msg.imageUrl && (
                <Card className="w-full max-w-4xl shadow-md border-0 overflow-hidden animate-in fade-in zoom-in-95">
                  <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-500" />
                      Generated Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 bg-black">
                    <img src={msg.imageUrl} alt="Generated music theory visualization" className="w-full h-auto object-contain max-h-[600px]" />
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
