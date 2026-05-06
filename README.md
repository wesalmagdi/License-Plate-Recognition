# License-Plate-Recognition 
1. Pipeline


Image
   
   ↓
   
Preprocessing
(Grayscale + Bilateral Filter) => done

   ↓
   
Canny Edge Detection  => done

   ↓
   
Morphological Closing => done 

   ↓
   
Contour Detection

   ↓
   
Plate Extraction

   ↓
   
Thresholding + Character Segmentation

   ↓
   
  OCR

   ↓
   
Predicted License Plate Text

   ↓
   
Store Result in SQLite Database
