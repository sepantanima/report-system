import axios from 'axios';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const PROVIDER_STRATEGIES = {
    google: async (config, prompt) => {
        // استفاده از نسخه v1 برای پایداری بیشتر در برخی کلیدها
        const url = `https://generativelanguage.googleapis.com/v1/models/${config.model}:generateContent?key=${config.key}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.data.candidates[0].content.parts[0].text;
    }
};

/**
 * لیست مدل‌ها به ترتیب اولویت. 
 * مدل‌های 8b سبک‌تر هستند و احتمال خطای 429 در آن‌ها کمتر است.
 */
const AI_CONFIG_POOL = [
    {
        name: "Gemini 1.5 Flash",
        type: "google",
        model: "gemini-1.5-flash",
        key: "AIzaSyByMVie7HFgNNzu09u7v5-lxlhMZQtgZbk"
    },
    {
        name: "Gemini 1.5 Flash 8B",
        type: "google",
        model: "gemini-1.5-flash-8b", 
        key: "AIzaSyByMVie7HFgNNzu09u7v5-lxlhMZQtgZbk"
    },
    {
        name: "Gemini 2.0 Flash",
        type: "google",
        model: "gemini-2.0-flash",
        key: "AIzaSyByMVie7HFgNNzu09u7v5-lxlhMZQtgZbk"
    }
];

class AIManager {
    async callAI(prompt) {
        let lastError = null;

        for (const config of AI_CONFIG_POOL) {
            let attempts = 0;
            const maxRetries = 2;

            while (attempts < maxRetries) {
                try {
                    console.log(`%c [تلاش] ${config.name} (تلاش ${attempts + 1})`, 'color: #00bfff');
                    return await PROVIDER_STRATEGIES[config.type](config, prompt);

                } catch (error) {
                    lastError = error;
                    const status = error.response?.status;

                    // اگر مدل پیدا نشد (404)، کلاً از این مدل بگذر و بعدی را امتحان کن
                    if (status === 404) {
                        console.warn(`%c [404] مدل ${config.name} در این ریجن یا کلید در دسترس نیست.`, 'color: #ff4500');
                        break; 
                    }

                    // مدیریت محدودیت ترافیک (429)
                    if (status === 429) {
                        attempts++;
                        if (attempts < maxRetries) {
                            console.warn(`%c [429] ${config.name} پر است. 12 ثانیه صبر...`, 'color: #ffa500');
                            await sleep(12000);
                            continue;
                        }
                    }
                    
                    console.error(`%c [خطا] ${config.name} پاسخ نداد. وضعیت: ${status}`, 'color: #ff0000');
                    break; 
                }
            }
        }
        throw new Error(`همه مدل‌ها با شکست مواجه شدند. آخرین پیام: ${lastError?.message}`);
    }

    async processNewsFullCycle(newsContent) {
        const prompt = `خلاصه خبر زیر را به زبان فارسی و در قالب چند بند کوتاه بنویس:\n\n${newsContent}`;
        return await this.callAI(prompt);
    }
}

export const aiManager = new AIManager();   