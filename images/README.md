# Room photos — drop your files here

The website picks these up automatically. No code change needed.
A room with no file keeps its generated look.

## Normal photos  (images/rooms/)
For each room id: standard, deluxe, suite, executive

    images/rooms/standard.jpg      <- card + main photo on the detail page
    images/rooms/standard-2.jpg    <- extra gallery photo (optional)
    images/rooms/standard-3.jpg    <- extra gallery photo (optional)

Recommended: JPG, about 1600 x 1000 px, under 400 KB each.

## 360° photos  (images/360/)

    images/360/standard.jpg   images/360/deluxe.jpg
    images/360/suite.jpg      images/360/executive.jpg

Must be an equirectangular panorama (width = 2 x height, e.g. 4096 x 2048).
Phone apps (Google Street View, Insta360, Ricoh Theta) export this format.
When the file exists, the "360° tour" button shows it instead of the generated room.

## What is in here right now
The pictures shipped with the site are 3D renders of each room (not camera photos),
made so the site has realistic-looking room images, a true 360 panorama and a 360 video tour
for every room type out of the box. To use your own photos, just replace the files with the
same names:

    images/rooms/<room>.jpg  (+ -2, -3)     main photo + gallery
    images/360/<room>.jpg                   2:1 equirectangular panorama
    videos/360/<room>.mp4                   video tour
