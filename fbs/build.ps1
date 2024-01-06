rm -r .\vector-tile-ts
rm -r .\vector_tile_python

rm -r ..\app\utils\vector-tile-js

.\flatc.exe --python -o vector_tile_python .\vector_tile_1.0.1.fbs
.\flatc.exe -T -o .\vector-tile-ts .\vector_tile_1.0.1.fbs
npx tsc