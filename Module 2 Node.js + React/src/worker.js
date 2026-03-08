import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true; 
if (env.backends && env.backends.webgpu) {
    env.backends.webgpu.powerPreference = 'high-performance';
}

let extractor;

self.onmessage = async (e) => {
    // Force lowercase to ensure strict matching
    const text = e.data.text.toLowerCase(); 
    const menu = e.data.menu;

    try {
        if (!extractor) {
            self.postMessage({ status: 'info', message: 'Loading Lightning AI (360M)...' });
            extractor = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-360M-Instruct', {
                device: 'webgpu',
                dtype: 'q4f16', 
            });
        }

        self.postMessage({ status: 'info', message: 'AI processing order...' });

        const menuStr = menu.map(m => m.name).join(', ');

        // THE BRACKET TRAP PROMPT
        // The AI is trained to output [Item, Qty] followed by its message.
        const prompt = `<|im_start|>system
You are a POS assistant. Menu: ${menuStr}
You MUST start your response with brackets [Item Name, Quantity] followed by a short message.

User: 2 butter chicken
Assistant: [Butter Chicken, 2] I've added 2 Butter Chickens to your order!

User: char butter naan
Assistant: [Butter Naan, 4] Added 4 Butter Naans.

User: 4 butter naan
Assistant: [Butter Naan, 4] 4 Butter Naans added to the order.

User: ek mango lassi aur do tandoori roti
Assistant: [Mango Lassi, 1] [Tandoori Roti, 2] Added those drinks and breads.

User: what do you recommend?
Assistant: [NONE, 0] I highly recommend our Paneer Tikka!<|im_end|>
<|im_start|>user
${text}<|im_end|>
<|im_start|>assistant
[`; // <-- WE PHYSICALLY FORCE THE BRACKET HERE. IT CANNOT HALLUCINATE.

        const output = await extractor(prompt, { 
            max_new_tokens: 60,
            temperature: 0.1, 
            repetition_penalty: 1.15,
            return_full_text: false 
        });
        
        // We stitch the bracket back on so React can parse it
        self.postMessage({ status: 'complete', result: "[" + output[0].generated_text });
    } catch (error) {
        console.error("Worker Error:", error);
        self.postMessage({ status: 'error', error: error.message });
    }
};