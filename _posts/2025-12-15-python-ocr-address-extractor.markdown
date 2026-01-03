---
layout: post
title: "Python과 Termux로 스크린샷 주소 자동 추출기 만들기"
date: 2025-12-15
categories: [blog]
tags: [Python, OCR, Termux, Tesseract, 자동화]
author: "퀵서비스 기사"
excerpt: "수동 주소 입력의 불편함을 해결하기 위해, 스마트폰 스크린샷에서 자동으로 주소를 인식하여 클립보드에 복사해주는 Python OCR 스크립트 개발기."
published: false
---

오늘 자동화의 부재로 온종일 고생하고 나니, 역시 사람은 도구를 써야 한다는 결론에 이르렀다. 그래서 퇴근 후 바로 '스크린샷에서 주소 추출 후 클립보드에 저장'하는 Python 스크립트의 전체 코드를 기록해두려 한다. 이 스크립트는 안드로이드용 터미널 앱인 **Termux** 환경에서 동작한다.

## 핵심 로직: 스크린샷 감지 및 주소 추출

이 프로그램의 동작 방식은 간단하다.

1.  `inotifywait`라는 도구로 스크린샷 폴더를 실시간으로 감시한다.
2.  새로운 스크린샷이 저장되면, 이미지에서 특정 Y좌표 구간만 잘라낸다. (인성 순정앱의 주소 표시 영역)
3.  잘라낸 이미지를 흑백으로 변환하여 OCR 인식률을 높인다.
4.  `Tesseract` OCR 엔진으로 이미지 안의 텍스트를 추출한다.
5.  정규식을 사용해 '서울', '인천' 등으로 시작하는 주소 패턴을 찾아낸다.
6.  찾아낸 주소를 Termux의 클립보드에 복사한다.

> 이제 어떤 배달 앱을 쓰든, 스크린샷 한 번만 찍으면 주소가 바로 복사되는 것이다.

## 전체 코드 (`newocr.py`)

아래는 이번에 작성한 스크립트의 전체 코드다. 이미지 처리에는 `Pillow`를, OCR에는 `pytesseract`를, 파일 시스템 감시와 클립보드 제어에는 `subprocess`를 사용했다.

```python
#!/data/data/com.termux/files/usr/bin/python
import subprocess
import os
import re
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

WATCH_DIR = os.path.expanduser("~/storage/pictures/Screenshots")

# y좌표 범위만 고정 (x는 전체 폭)
CROP_Y1 = 1640
CROP_Y2 = 2060

def preprocess_image(img):
    gray = img.convert("L")
    # 이미지를 순수한 흑과 백으로 구분하여 글자를 더 명확하게 만듭니다.
    processed = gray.point(lambda x: 0 if x < 128 else 255, '1')
    return processed

def extract_address(text):
    cleaned = text.replace("\n", " ")
    cleaned = cleaned.replace("서물", "서울")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    match = re.search(r"(서울.*|인천.*|경기.*)", cleaned)
    if match:
        return match.group(1)
    return cleaned

def run_ocr_with_ycrop(image_path):
    img = Image.open(image_path)
    # 이미지 전체 폭을 사용하고 y좌표만 잘라냄
    cropped = img.crop((0, CROP_Y1, img.width, CROP_Y2))
    cropped.save("debug.png")  # 디버깅용 저장
    processed = preprocess_image(cropped)
    text = pytesseract.image_to_string(processed, lang="kor", config="--psm 6")
    return extract_address(text)

def copy_to_clipboard(text):
    proc = subprocess.Popen(["termux-clipboard-set"], stdin=subprocess.PIPE)
    proc.communicate(input=text.encode("utf-8"))

def watch_screenshots():
    cmd = [
        "inotifywait", "-m", "-e", "close_write,moved_to,create",
        "--format", "%w%f", WATCH_DIR
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, text=True)

    print(f"Watching {WATCH_DIR} for new screenshots...")
    for line in proc.stdout:
        filepath = line.strip()
        filename = os.path.basename(filepath)

        if filename.startswith(".pending-"):
            continue

        print(f"New screenshot detected: {filepath}")
        try:
            address = run_ocr_with_ycrop(filepath)
            print(f"Extracted address: {address}")
            copy_to_clipboard(address)
            print("Copied address to clipboard.")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    watch_screenshots()
```
