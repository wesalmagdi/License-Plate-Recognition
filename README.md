#  License Plate Recognition Pipeline

A multi-stage adaptive image processing pipeline for automatic license plate detection and recognition, built with OpenCV and Python.

---

## Pipeline Overview

```
Input Image
     │
     ▼
┌─────────────────────────────────────────┐
│  M1 · Edge Detection           Done   │
│  Grayscale + CLAHE + Bilateral Filter   │
│  + Otsu-tuned Canny Edges               │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│  M2 · Plate Candidate          Done   │
│  Blackhat/Tophat Morphology             │
│  + Scharr Gradient + Contour Scoring    │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│  M3 · Binarization             Done   │
│  Perspective Warp + Warp Scoring        │
│  + Adaptive Otsu / Local Threshold      │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│  OCR · Character Recognition   TODO  │
│  Thresholding + Segmentation + OCR      │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│  Storage                       TODO  │
│  Store Result in SQLite Database        │
└─────────────────────────────────────────┘
```

---

## Project Structure

```
project/
├── DIP_Project.ipynb       # Main notebook (M1, M2, M3 + Flask server)
├── lpr-app/                # React frontend (Plate Detector website)
│   ├── src/
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
├── README.md
└── dataset/                # License plate images (see Dataset link below)
```

---

## How to Run

### 1 · Install Python dependencies

```bash
pip install opencv-python numpy matplotlib flask flask-cors
```

### 2 · Run the Notebook

Open `DIP_Project.ipynb` in Jupyter or VS Code and run cells **in order**:

| Cell | Description |
|------|-------------|
| Cell 1 | Imports |
| Cell 3 | M1 — Edge Detection |
| Cell 5 | M2 — Plate Candidate |
| Cell 7 | M3 — Binarization |
| Cell 9 | `run_pipeline()` combined function |
| **Cell 10** | **Flask API server** ← run this to link with the website |

> Cell 10 starts a local API at `http://localhost:5050`. Keep it running while using the website.

### 3 · Run the React Frontend

```bash
cd lpr-app

# First time only
npm install

# Every time
npm start
```

Opens the **Plate Detector** website at **`http://localhost:3000`**

> Make sure the notebook Flask server (Cell 10) is running before uploading images.

### 4 · Quick Test in Notebook (no website)

Change the path in the last cell and run:

```python
IMAGE_PATH = 'your_image.jpg'
run_pipeline(IMAGE_PATH, visualize=True)
```

---

## Dataset

[Google Drive — License Plate Images](https://drive.google.com/drive/folders/1XShMydIi2WidM-2WR4bbngt-wrv7DuqZ?usp=drive_link)

---

## Team

| Stage | Member | Status |
|-------|--------|--------|
| M1 · Edge Detection | — |  Done |
| M2 · Plate Candidate | — |  Done |
| M3 · Binarization | — |  Done |
| OCR · Character Recognition | — | 🔲 In Progress |
| Storage · SQLite | — | 🔲 In Progress |
| Frontend · React Website | — |  Done |

---

## Tech Stack

- **Python** · OpenCV, NumPy, Matplotlib
- **Flask** · REST API backend
- **React** · Frontend website (Plate Detector)
- **SQLite** · Result storage *(upcoming)*
- **Tesseract / EasyOCR** · OCR engine *(upcoming)*
