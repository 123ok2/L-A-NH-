
import { GoogleGenAI, Type } from "@google/genai";

export interface AIResult {
  title: string;
  content: string;
  authorName: string;
  fakeComments: { authorName: string, content: string }[];
}

const AI_DIRECTION = "Lửa Nhỏ - Cộng đồng chia sẻ mẹo vặt, cảm hứng học tập và kỹ năng sống cho giới trẻ Việt Nam. Giọng văn gần gũi, Gen Z, tích cực, không dạy đời.";

export const generateAIPost = async (topic: string, category: string = "Chung"): Promise<AIResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Hãy đóng vai một chuyên gia sáng tạo nội dung cho ${AI_DIRECTION}. 
      Viết một bài đăng cho chuyên mục "${category}" về chủ đề cụ thể: "${topic}". 
      
      YÊU CẦU QUAN TRỌNG:
      - Tên tác giả (authorName) là một tên người Việt Nam ngẫu nhiên, hiện đại (VD: Minh Anh, Hoàng Nam, Linh Chi...).
      - Nội dung bài viết phải mang tính chia sẻ, hữu ích, có tâm.
      - Các bình luận seeding (fakeComments) phải thể hiện sự tương tác tích cực, đặt câu hỏi hoặc cảm ơn theo đúng văn hóa mạng xã hội giới trẻ.
      
      Yêu cầu trả về định dạng JSON chính xác:
      {
        "title": "Tiêu đề cực cuốn",
        "content": "Nội dung bài viết tâm huyết",
        "authorName": "Tên Tác Giả Ngẫu Nhiên",
        "fakeComments": [
          { "authorName": "Tên Seeding 1", "content": "Bình luận 1" },
          { "authorName": "Tên Seeding 2", "content": "Bình luận 2" },
          { "authorName": "Tên Seeding 3", "content": "Bình luận 3" }
        ]
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            authorName: { type: Type.STRING },
            fakeComments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  authorName: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["authorName", "content"]
              }
            }
          },
          required: ["title", "content", "authorName", "fakeComments"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Post Error:", error);
    return { title: "", content: "", authorName: "", fakeComments: [] };
  }
};

export const suggestAITitle = async (category: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gợi ý 1 tiêu đề bài viết ngắn gọn, cực cuốn cho chủ đề "${category}" trong cộng đồng ${AI_DIRECTION}. Chỉ trả về duy nhất chuỗi tiêu đề, không thêm gì khác.`,
    });
    return response.text.trim().replace(/['"]/g, '');
  } catch (e) {
    return "Mẹo nhỏ cho ngày mới";
  }
};

export const refineAIContent = async (currentContent: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Hãy giúp tôi tinh chỉnh đoạn văn sau theo phong cách ${AI_DIRECTION}. Hãy làm nó cuốn hút hơn, thêm emoji phù hợp và sửa lỗi diễn đạt: "${currentContent}". Chỉ trả về nội dung đã sửa.`,
    });
    return response.text.trim();
  } catch (e) {
    return currentContent;
  }
};
