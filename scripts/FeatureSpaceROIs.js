var SVix = ee.ImageCollection("COPERNICUS/S1_GRD")
                .filterBounds(geometry)
                //.select('VV','VH')
                .filterMetadata('transmitterReceiverPolarisation', 'equals', ['VV', 'VH'])
                .filterDate('2018-10-08','2018-10-09')
                .filter(ee.Filter.eq('instrumentMode', 'IW'));
                //.mosaic()
 
// Filter to get images from different look angles.
var vhAscending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
print(vhAscending,"vhAscending")
var vhDescending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
print(vhDescending,"vhDescending")


// Create a composite from means at different polarizations and look angles.
var SVixx = ee.Image.cat([
  vhAscending.select('VH').mean(),
  ee.ImageCollection(vhAscending.select('VV').merge(vhDescending.select('VV'))).mean().rename("VV_comp"),
  vhDescending.select('VH').mean().rename("VH_comp")
]).focal_median();

SVix = SVix.mosaic().addBands(SVixx.select("VV_comp"));
             
print(SVix,"SVix_composite")

Map.setCenter(9.247881938228714,43.41221619485682, 12);
Map.addLayer(SVix.select("VV").clip(geometry), {min: -33, max: -12}, 'Image_VV', false);
Map.addLayer(SVixx.select("VV_comp").clip(geometry), {min: -27, max: -18}, 'Image_VH_comp', false);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//function create_norm_diff(image){
//  var ang = image.select(['angle'])
//  var corr1 = image
//  var vh = corr1.select('VH').subtract(corr1.select('angle').multiply(3.14/180.0).cos().log10().multiply(10.0))
//  var vhcorr = vh.addBands(image.select('VV').subtract(image.select('angle').multiply(3.14/180.0).cos().log10().multiply(10.0)))
//  return image.addBands(ee.Image(vhcorr.expression('(VH - VV) / (VH + VV)', {'VH': vhcorr.select(['VH']),'VV': vhcorr.select(['VV'])})).rename('vhcorr'))
//}
//
//
//var SVix = SVix.map(create_norm_diff).mean().clip(geometry)//.mean()
//print(SVix,"image_norm")
//Map.addLayer(SVix.clip(geometry).select([3]), {min: 0.05, max: 0.35}, 'Image_norm',false);
//

SVix=SVix.multiply(10).add(1).toInt32().clip(geometry)

print(SVix,"SVix_col")
///////////////////////////////////////////////////////////////////////////////////
var glcm = SVix.select('VV_comp').glcmTexture({size: 6});
//var glcm = SVix.select('VV').glcmTexture({size: 6});
print(glcm,"glcm")

//var contrast = glcm.select('VV_contrast');
var contrast = glcm.select('VV_comp_contrast');
Map.addLayer(contrast,
             {min: 0, max: 1500, palette: ['0000CC', 'CC0000']},
             'contrast',false);
SVix = SVix.addBands(contrast);
print(SVix,"contrast")
/////////////////////////////////////////////////////////////////////////////////
var square = ee.Kernel.square({radius: 6});

// Compute entropy and display.
//var entropy = SVix.select('VV').entropy(square).rename('entropy');
var entropy = SVix.select('VV_comp').entropy(square).rename('entropy');
print(entropy,"entropy")
Map.addLayer(entropy,
             {min: 1, max: 5, palette: ['0000CC', 'CC0000']},
             'entropy',false);
             
/////////////////////////////////////////////////////////////////////////////////
var list = [1, 1, 1, 1, 1, 1, 1, 1, 1];
var centerList = [1, 1, 1, 1, 0, 1, 1, 1, 1];
var lists = [list, list, list, list, centerList, list, list, list, list];
var kernel = ee.Kernel.fixed(9, 9, lists, -4, -4, false);

//var neighs = SVix.select('VV').neighborhoodToBands(kernel);
var neighs = SVix.select('VV_comp').neighborhoodToBands(kernel);

//var gearys = SVix.select('VV').subtract(neighs).pow(2).reduce(ee.Reducer.sum())
var gearys = SVix.select('VV_comp').subtract(neighs).pow(2).reduce(ee.Reducer.sum())
             .divide(Math.pow(9, 2)).rename('gearys');
Map.addLayer(gearys,
             {min: 20, max: 2500, palette: ['0000CC', 'CC0000']},
             "Geary's C",
             false);
             
///////////////////////////////////////////////////////////////////////////////////
//var xyGrad = SVix.select('VV').gradient();
var xyGrad = SVix.select('VV_comp').gradient();
var gradient = xyGrad.select('x').pow(2)
                        .add(xyGrad.select('y').pow(2)).sqrt().rename('gradient');

var direction = xyGrad.select('y').atan2(xyGrad.select('x')).rename('direction');

// Display the results.
Map.addLayer(direction, {min: -2, max: 2, format: 'png'}, 'direction',false);
Map.addLayer(gradient, {min: -7, max: 7, format: 'png'}, 'gradient',false);

////////////////////////////////////////////////////////////////////////////////////
// Define a boxcar or low-pass kernel.
var boxcar = ee.Kernel.square({
  radius: 7, units: 'pixels', normalize: true
});

// Smooth the image by convolving with the boxcar kernel.
//var smooth = SVix.select('VV').convolve(boxcar).rename('vv_smooth');
var smooth = SVix.select('VV_comp').convolve(boxcar).rename('vv_smooth');
print(smooth,"smooth")

Map.addLayer(smooth, {min: -7, max: 7, format: 'png'}, 'smooth',false);
/////////////////////////////////////////////////////////////////////////////////////

var laplacian = ee.Kernel.laplacian8({ normalize: true });
print(laplacian,"laplacian")
// Apply the edge-detection kernel.


//var edgy = SVix.select('VV').convolve(laplacian).rename('edguy');
var edgy = SVix.select('VV_comp').convolve(laplacian).rename('edguy');
print(edgy,"edgy")
Map.addLayer(edgy, {min: -7, max: 7, format: 'png'}, 'edgy',false);


//////////////////////////////////////////////////////////////////////////////////////

SVix = SVix.addBands(contrast);
print(SVix,"contrast")
SVix = SVix.addBands(entropy);
print(SVix,"entropy")
SVix = SVix.addBands(gearys);
print(SVix,"gearys")
SVix = SVix.addBands(direction);
print(SVix,"direction")
SVix = SVix.addBands(gradient);
print(SVix,"gradient")
SVix = SVix.addBands(smooth);
print(SVix,"smooth")
SVix = SVix.addBands(edgy);
//print(SVix,"edgy")
print(SVix,"Bandas")

// Carrega amostras
var points1 = oleo;
var points2 = points1.merge(noleo);
print(points2,"points2")


////////////////////////
//var bands = ['VV','VV_comp', 'vv_smooth','edguy','VV_comp_contrast']; //'entropy', 'gearys', 'direction','VV_contrast','gradient',
//var bands = ['VV_comp','VV_comp_contrast','entropy','direction'];
var bands = ['VV','VV_comp'];

//var bands = ['VV','VV_contrast', 'gearys', 'direction', 'gradient'];

// Overlay the points on the imagery to get training.
var training = SVix.select(bands).sampleRegions(points2, ['class'], 2);

var classifier_RF = ee.Classifier.randomForest(10).train(training, 'class', bands);
var classified_RF = SVix.classify(classifier_RF);


//var classified_wekacascade =ee.Clusterer.wekaCascadeKMeans(2).SVix;

// Instantiate the clusterer and train it.
//var clusterer = ee.Clusterer.wekaCascadeKMeans(2).train(training, bands);

// Cluster the input using the trained clusterer.
//var wekaKMeans = SVix.cluster(clusterer);



Map.addLayer(classified_RF, { //.clip(geometry3)
      "min": 1,
      "max": 2,
      "palette": "066311,86d6a4,e7b53b,"+
                 "d0670f,c70000,482628," +
                 "5b6c7f,ce54dd,2620e5",
    "format": "png"
},  'Class_RF',true);


//Map.addLayer(wekaKMeans, { //.clip(geometry3)
//      "min": 1,
//      "max": 2,
//      "palette": "066311,86d6a4,e7b53b,"+
//                 "d0670f,c70000,482628," +
//                 "5b6c7f,ce54dd,2620e5",
//    "format": "png"
//},  'wekaCascadeKMeans',true);

//  Export.image.toDrive({
//    image: classified_RF.select("classification_"+ano).toUint8(),
//    description: 'Classificação'+ano,
//    folder: 'Classificacao',
//    maxPixels:1e13,
//    scale: 30,
//    region: geometry
//  });
//












