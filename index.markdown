---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
---

<div class="container my-5">
  <div class="p-5 text-center bg-body-tertiary rounded-3">
    <h1 class="text-body-emphasis">안녕하세요!</h1>
    <p class="col-lg-8 mx-auto fs-5 text-muted">
      이곳은 저의 개인 블로그 및 포트폴리오 공간입니다. 다양한 프로젝트와 생각들을 기록하고 공유합니다.
    </p>
  </div>
</div>

<div class="container px-4 py-5" id="projects">
  <h2 class="pb-2 border-bottom">프로젝트</h2>
  <div class="row row-cols-1 row-cols-md-2 align-items-md-center g-5 py-5">
    <div class="col d-flex flex-column align-items-start gap-2">
      <h3 class="fw-bold">
        <a href="/apps/janggi/" class="text-decoration-none">장기 FEN 변환기</a>
      </h3>
      <p class="text-muted">
        장기 기보나 특정 상황을 FEN(Forsyth-Edwards Notation) 문자열로 손쉽게 변환하고 편집할 수 있는 웹 도구입니다. 장기판 위에서 기물을 직접 배치하고 FEN 코드를 생성하거나 복사할 수 있습니다.
      </p>
      <a href="/apps/janggi/" class="btn btn-primary btn-lg">바로가기</a>
    </div>

    <div class="col d-flex flex-column align-items-start gap-2">
      <h3 class="fw-bold">
        <a href="/apps/juso/" class="text-decoration-none">주소 분석 도구</a>
      </h3>
      <p class="text-muted">
        퀵서비스 및 배달 기사님들을 위해, 여러 도시에 중복으로 존재하는 동 이름, 존재하지 않는 동 이름 등을 분석하고, 배달 앱에서 활용할 수 있는 제외지 목록을 자동으로 생성해주는 도구입니다.
      </p>
      <a href="/apps/juso/" class="btn btn-primary btn-lg">바로가기</a>
    </div>
  </div>
</div>
