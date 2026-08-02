import { z } from "zod";
import type { Provider, ScrapeResult, ProviderOptions, StructuredResearchOptions, StructuredResearchResult } from "../types";

export const azureFoundryApi: Provider = {
    id: "azure-foundry-api",
    name: "Azure AI Foundry",

    isConfigured() {
        return !!process.env.AZURE_FOUNDRY_API_KEY;                                                                            
    },

    async run(model: string, prompt: string, options?: ProviderOptions): Promise<ScrapeResult> {
        const targetModel = options?.version ?? model;                                                                         
        const apiKey = process.env.AZURE_FOUNDRY_API_KEY;                                                                      
        let baseUrl = process.env.AZURE_FOUNDRY_BASE_URL;                                                                      

        if (!apiKey || !baseUrl) {                                                                                             
            throw new Error(`Missing Azure Foundry configuration for ${targetModel}`);                                         
        }                                                                                                                      

        // Ensure the URL ends with /chat/completions                                                                          
        if (!baseUrl.endsWith("/chat/completions")) {                                                                          
            baseUrl = baseUrl.replace(/\/v1\/?$/, ""); // strip trailing /v1                                                   
            baseUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;                                                        
        }                                                                                                                      

        const res = await fetch(baseUrl, {                                                                                     
            method: "POST",                                                                                                    
            headers: {                                                                                                         
                "Authorization": `Bearer ${apiKey}`,                                                                           
                "api-key": apiKey, // Some Azure models use api-key instead of Bearer                                          
                "Content-Type": "application/json",                                                                            
            },                                                                                                                 
            body: JSON.stringify({                                                                                             
                model: targetModel,                                                                                            
                messages: [{ role: "user", content: prompt }],                                                                 
            }),                                                                                                                
        });                                                                                                                    

        if (!res.ok) {                                                                                                         
            throw new Error(`Azure Foundry API error (${res.status}): ${await res.text()}`);                                   
        }                                                                                                                      

        const data: any = await res.json();                                                                                    
        const content = data?.choices?.[0]?.message?.content ?? "";                                                            

        return {                                                                                                               
            rawOutput: data,
            textContent: content,
            webQueries: [],
            citations: [],
            modelVersion: targetModel,                                                                                         
        };                                                                                                                     
    },

    async runStructuredResearch<T>({ prompt, schema }: StructuredResearchOptions<T>): Promise<StructuredResearchResult<T>> {
        throw new Error("Structured research not yet implemented for Azure Foundry generic endpoints.");                       
    },
};
