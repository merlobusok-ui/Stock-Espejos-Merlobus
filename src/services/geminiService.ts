
import { GoogleGenAI, Type } from "@google/genai";
import { Product, RawMaterial } from "../types";

export const getAIInventoryAdvice = async (products: Product[], mps: RawMaterial[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inventoryState = {
    criticalProducts: products.filter(p => p.stock <= p.min).map(p => `${p.sku} (${p.stock}/${p.min})`),
    criticalMaterials: mps.filter(m => m.stock <= m.min).map(m => `${m.desc} (${m.stock}/${m.min})`),
  };

  const prompt = `
    Como consultor experto en manufactura, analiza el siguiente estado de inventario para una fábrica de espejos de ómnibus:
    Productos con bajo stock: ${inventoryState.criticalProducts.join(', ')}
    Materias primas con bajo stock: ${inventoryState.criticalMaterials.join(', ')}
    
    Proporciona 3 consejos estratégicos breves y accionables para la producción de hoy.
    Enfócate en priorizar qué fabricar basado en las materias primas disponibles y qué comprar urgentemente.
    Responde en formato JSON con una lista de 'consejos'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consejos: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text).consejos;
  } catch (error) {
    console.error("Gemini advice error:", error);
    return ["Prioriza reponer stock de los productos con mayor demanda histórica.", "Verifica la llegada de materias primas críticas.", "Revisa las órdenes de producción pendientes."];
  }
};
