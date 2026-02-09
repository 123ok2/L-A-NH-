
export const SEED_POSTS = [
  // Mẹo vặt cuộc sống
  { title: "Mẹo dậy sớm không mệt mỏi", category: "Mẹo vặt", content: "Đừng đặt chuông điện thoại ngay sát đầu giường. Hãy để nó ở góc phòng, buộc bạn phải bước xuống giường để tắt. Khi đã đứng dậy rồi, cơn buồn ngủ sẽ giảm đi 50%!" },
  { title: "Cách khử mùi giày cực nhanh", category: "Mẹo vặt", content: "Bỏ hai túi trà khô vào trong giày qua đêm. Trà sẽ hút ẩm và khử mùi cực kỳ hiệu quả mà không cần giặt." },
  { title: "Dọn dẹp bàn học trong 5 phút", category: "Mẹo vặt", content: "Áp dụng quy tắc 'Bề mặt trống'. Mọi thứ không dùng đến trong 10 phút tới phải được cất vào ngăn kéo. Bàn càng trống, não càng tập trung." },
  { title: "Uống nước đúng cách", category: "Mẹo vặt", content: "Đừng đợi khát mới uống. Hãy đặt một bình nước 1.5L ngay bàn học và dán ticker: 'Mỗi chương học - một ngụm nước'." },
  { title: "Mẹo tiết kiệm tiền ăn vặt", category: "Mẹo vặt", content: "Mỗi khi định mua trà sữa, hãy chuyển số tiền đó vào một tài khoản tiết kiệm riêng. Cuối tháng bạn sẽ sốc vì số tiền mình giữ lại được đấy." },

  // Học thông minh
  { title: "Kỹ thuật Pomodoro cho 'lính mới'", category: "Học thông minh", content: "25 phút học, 5 phút nghỉ. Nhưng nhớ là trong 5 phút đó, TUYỆT ĐỐI không chạm vào điện thoại. Hãy đứng dậy vươn vai hoặc uống nước." },
  { title: "Cách nhớ từ vựng tiếng Anh", category: "Học thông minh", content: "Đừng học từ đơn lẻ. Hãy học theo cụm từ (Collocations). Thay vì học từ 'decision', hãy học 'make a decision'." },
  { title: "Phương pháp Feynman để hiểu sâu", category: "Học thông minh", content: "Hãy thử giải thích bài toán khó cho một đứa trẻ lớp 5. Nếu bạn giải thích được đơn giản, nghĩa là bạn đã thực sự hiểu nó." },
  { title: "Nghe nhạc gì khi học?", category: "Học thông minh", content: "Nhạc không lời, Lo-fi hoặc nhạc Baroque là tốt nhất. Nhạc có lời sẽ khiến não bộ bận rộn xử lý ngôn ngữ và xao nhãng bài học." },
  { title: "Ghi chú theo kiểu Cornell", category: "Học thông minh", content: "Chia trang giấy làm 3 phần: Từ khóa, Nội dung chính và Tóm tắt. Đây là cách ôn bài cực nhanh trước khi thi." },

  // Kỹ năng & Tư duy
  { title: "Tư duy phát triển (Growth Mindset)", category: "Kỹ năng & Tư duy", content: "Thay vì nói 'Mình không làm được', hãy nói 'Mình CHƯA làm được'. Một từ thôi nhưng thay đổi cả thái độ của bạn với khó khăn." },
  { title: "Cách vượt qua nỗi sợ thuyết trình", category: "Kỹ năng & Tư duy", content: "Hãy nhớ rằng khán giả muốn bạn thành công. Họ ở đó để nghe thông tin, không phải để soi lỗi sai của bạn đâu. Tự tin lên!" },
  { title: "Kỹ năng từ chối khéo léo", category: "Kỹ năng & Tư duy", content: "Khi ai đó nhờ vả lúc bạn bận: 'Mình rất muốn giúp nhưng hiện tại mình phải hoàn thành việc này. Để tối mình nhắn lại nhé?'." },
  { title: "Quản lý thời gian kiểu Ma trận Eisenhower", category: "Kỹ năng & Tư duy", content: "Chia việc thành 4 nhóm: Quan trọng/Khẩn cấp, Quan trọng/Không khẩn cấp... Tập trung vào nhóm Quan trọng nhưng Không khẩn cấp để tránh stress." },
  { title: "Làm gì khi thất bại?", category: "Kỹ năng & Tư duy", content: "Viết ra 3 bài học bạn rút ra được. Thất bại là học phí cho sự khôn ngoan sau này. Đừng dằn vặt mình quá lâu." },

  // Truyền cảm hứng
  { title: "Mỗi ngày chỉ cần 1%", category: "Truyền cảm hứng", content: "Bạn không cần phải giỏi ngay lập tức. Chỉ cần hôm nay bạn tốt hơn hôm qua 1%, sau một năm bạn sẽ giỏi hơn gấp 37 lần." },
  { title: "Dành cho những ngày mệt mỏi", category: "Truyền cảm hứng", content: "Nghỉ ngơi không phải là bỏ cuộc. Một cỗ máy cũng cần bảo trì, và bạn cũng vậy. Hôm nay hãy đi ngủ sớm một chút nhé." },
  { title: "Bạn không thua kém ai cả", category: "Truyền cảm hứng", content: "Mỗi bông hoa đều có thời điểm nở rộ riêng. Đừng so sánh hành trình của mình với kết quả rực rỡ của người khác trên mạng xã hội." },
  { title: "Viết cho người đang chán nản", category: "Truyền cảm hứng", content: "Áp lực tạo nên kim cương. Nhưng kim cương cũng phải trải qua quá trình mài giũa đau đớn. Bạn đang trong quá trình đó thôi." },
  { title: "Sống tử tế từ những điều nhỏ", category: "Truyền cảm hứng", content: "Cười với cô lao công, nhặt một mảnh rác, nhường chỗ trên xe bus... Những đốm lửa nhỏ này sẽ làm ấm trái tim bạn trước tiên." },

  // Công nghệ
  { title: "Tránh nghiện mạng xã hội", category: "Công nghệ & Mẹo số", content: "Tắt toàn bộ thông báo (Notifications) ngoại trừ cuộc gọi. Bạn sẽ bất ngờ vì mình có thêm rất nhiều thời gian mỗi ngày." },
  { title: "Canva cho bài thuyết trình", category: "Công nghệ & Mẹo số", content: "Dùng tổ hợp phím 'Magic shortcuts' khi trình chiếu: Nhấn 'C' để có pháo hoa, nhấn 'D' để có tiếng trống. Bài trình bày sẽ thú vị hơn hẳn!" },
  { title: "Dùng điện thoại thông minh hơn", category: "Công nghệ & Mẹo số", content: "Cài đặt chế độ 'Màn hình xám' (Grayscale) vào buổi tối. Màu sắc nhợt nhạt sẽ làm não bớt hưng phấn và giúp bạn dễ rời xa điện thoại để đi ngủ." },
  { title: "AI giúp bạn học tốt hơn", category: "Công nghệ & Mẹo số", content: "Đừng nhờ AI làm hộ bài tập. Hãy nhờ nó 'Giải thích bước giải bài toán này cho mình'. Đó mới là cách dùng công nghệ thông minh." },
  { title: "Mẹo bảo vệ mắt khi dùng máy tính", category: "Công nghệ & Mẹo số", content: "Quy tắc 20-20-20: Cứ sau 20 phút nhìn màn hình, hãy nhìn ra xa 20 feet (6m) trong vòng 20 giây." }
];
