---
layout: default
title: 문의하기
permalink: /contact/
---

<div class="container my-5">
  <h2>문의하기</h2>
  <p>아래 양식을 통해 문의사항을 보내주시면 확인 후 연락드리겠습니다.</p>
  
  <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-netlify-redirect="/thanks/">
    <input type="hidden" name="form-name" value="contact" />
    <p class="d-none">
      <label>
        Don’t fill this out if you’re human: <input name="bot-field" />
      </label>
    </p>
    <div class="mb-3">
      <label for="name" class="form-label">이름</label>
      <input type="text" class="form-control" name="name" id="name" required>
    </div>
    <div class="mb-3">
      <label for="email" class="form-label">이메일</label>
      <input type="email" class="form-control" name="email" id="email" required>
    </div>
    <div class="mb-3">
      <label for="message" class="form-label">내용</label>
      <textarea class="form-control" name="message" id="message" rows="5" required></textarea>
    </div>
    <button type="submit" class="btn btn-primary">보내기</button>
  </form>
</div>
