
import { GoogleGenAI, Type } from "@google/genai";

export interface AIResult {
  title: string;
  content: string;
  authorName: string;
  fakeComments: { authorName: string, content: string }[];
}

export const generateAIPost = async (topic: string): Promise<AIResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Hãy đóng vai một chuyên gia sáng tạo nội dung cho giới trẻ. Viết một bài đăng về chủ đề: "${topic}". 
      
      YÊU CẦU QUAN TRỌNG VỀ TÁC GIẢ:
      - Tên tác giả (authorName) PHẢI là một tên người Việt Nam ngẫu nhiên, hiện đại (VD: Tùng Dương, Bảo Vy, Gia Bách, Linh Đan, Nhật Minh...). 
      - ĐẢM BẢO TÊN KHÔNG BỊ TRÙNG LẶP với các bài trước. 
      - Giọng văn: Gần gũi, Gen Z, tích cực, không dạy đời.
      
      YÊU CẦU VỀ BÌNH LUẬN:
      - Tạo 3 bình luận seeding từ các tài khoản khác nhau (tên cũng phải ngẫu nhiên).
      
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
    const randomNames = ["Hoàng Nam", "Thùy Chi", "Minh Đức", "Khánh Linh", "Tuấn Kiệt", "Phương Anh"];
    return { 
      title: "Cảm hứng ngày mới", 
      content: "Hãy bắt đầu ngày mới thật năng lượng nhé!", 
      authorName: randomNames[Math.floor(Math.random() * randomNames.length)],
      fakeComments: []
    };
  }
};
