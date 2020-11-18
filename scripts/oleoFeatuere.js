
var functExport = function(featCol, name){
    
    var pmtoExpoAsset ={
      collection: featCol,
      description: name,
      assetId: 'users/CartasSol/ROIs/' + name
    }    
    Export.table.toAsset(pmtoExpoAsset)

    var pmtoExporDriver ={
      collection: featCol,
      description: name,
      folder: 'CSV'
    }
    Export.table.toDrive(pmtoExporDriver)
    
}
  
function create_norm_diff(image){
        
    var ang = image.select(['angle']).multiply(3.14/180.0).cos().log10().multiply(10.0)
    var vh = image.select('VH').subtract(ang)
    var vhcorr = image.addBands(image.select('VV').subtract(ang))
    vhcorr = vhcorr.expression("float(b('VH') - b('VV')) / (b('VH') + b('VV'))").rename('vhcorr')
    
    return image.addBands(vhcorr)
}


var visAll ={
    
    visVV : {
        min: -33, 
        max: -12,
        bands: ["VV"] 
    },
    
    visVV_c : {
        min: -27, 
        max: -18,
        bands: ['VV_comp'] 
    }
}

var param = {
    assetROIs_OleNOle: 'users/CartasSol/shapes/PointsControleOil_NOle',
    assetROIs_OleSR: 'users/CartasSol/shapes/PointsControleOil_OleSR',
    assetROIs_OleCR: 'users/CartasSol/shapes/PointsControleOil_OleCR'


}

var lsCoord = [[[9.470434412266368, 43.38811418505556],
                [9.373617395664805, 43.4195428495593],
                [9.23766158511793, 43.43998766625679],
                [9.149084314610118, 43.45095520862915],
                [9.035787805821055, 43.4469672414735],
                [9.011068567539805, 43.43300728580185],
                [9.003515466953868, 43.359664677493356],
                [9.03441451480543, 43.32520794375745],
                [9.13878463199293, 43.312718793640336],
                [9.261694177891368, 43.277735516675875],
                [9.372930750156993, 43.24023110231278],
                [9.480047449375743, 43.23522876834445],
                [9.48485396793043, 43.2812347499954],
                [9.483480676914805, 43.353174324275265]]
                ];
var geometry = ee.Geometry.Polygon(lsCoord)
          

var SVix = ee.ImageCollection("COPERNICUS/S1_GRD")
                .filterBounds(geometry)
                //.select('VV','VH')
                .filterMetadata('transmitterReceiverPolarisation', 'equals', ['VV', 'VH'])
                .filterDate('2018-10-08','2018-10-09')
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .map(function(img){return img.clip(geometry)})
                //.mosaic()

SVix = SVix.map(create_norm_diff) 


// Filter to get images from different look angles.
var vhAscending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
print(vhAscending,"vhAscending")
var vhDescending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
print(vhDescending,"vhDescending")


// Create a composite from means at different polarizations and look angles.
var SVixx = ee.Image.cat([
    vhAscending.select('VH').mean(),
    ee.ImageCollection(vhAscending.select('VV').merge(vhDescending.select('VV'))).mean().rename("VV_comp"),
    vhDescending.select('VH').mean().rename("VH_comp"),
    ee.ImageCollection(vhAscending.select('vhcorr').merge(vhDescending.select('vhcorr'))).mean().rename("VHcorr_comp"),
]).focal_median();

print("mosaico com focal_median", SVixx)
SVix = SVix.mosaic().addBands(SVixx.select(["VV_comp", 'VHcorr_comp']));             
print("SVix_composite", SVix)

Map.setCenter(9.247881938228714, 43.41221619485682, 12);
Map.addLayer(SVix.select("VV"), {min: -33, max: -12}, 'Image_VV', false);
Map.addLayer(SVixx.select("VV_comp"), {min: -27, max: -18}, 'Image_VH_comp', false);
Map.addLayer(SVix.select("VHcorr_comp"), {min: 0.05, max: 0.35}, 'Image_norm',false);

/////////////////////////////////////////////////////////////////
//============== Gerando novas features  ======================//
/////////////////////////////////////////////////////////////////

SVix= SVix.toInt32()
print("SVix_col", SVix)
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
////////////////////////////////////////////////////////////////////////

var laplacian = ee.Kernel.laplacian8({ normalize: true });
print(laplacian,"laplacian")// Apply the edge-detection kernel.


//var edgy = SVix.select('VV').convolve(laplacian).rename('edguy');
var edgy = SVix.select('VV_comp').convolve(laplacian).rename('edguy');
print(edgy,"edgy")
Map.addLayer(edgy, {min: -7, max: 7, format: 'png'}, 'edgy',false);

////======================================================////
// Adicionando novas bandas ////

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

///////////////////////////////////////////////////////////////////////////
//============================ Carrega amostras =======================////
var featROIs = ee.FeatureCollection(param.assetROIs_OleNOle).merge(
                        ee.FeatureCollection(param.assetROIs_OleSR)).merge(
                        ee.FeatureCollection(param.assetROIs_OleCR))
                
print(featROIs.aggregate_histogram('label'))

var bands = ['VV','VH','VV_comp','VHcorr_comp','VV_comp_contrast','entropy',
            'gearys', 'direction','vv_smooth','gradient','edguy'];

// Overlay the points on the imagery to get training.
var training = SVix.select(bands).sampleRegions(featROIs, ['label'], 2);
functExport(training, 'pointsROIs_Oleo')


///////////////////////////////////////////////////////////////////////////
/////////Isto da Compute value is too large    ////////////////////////////
// var classifier_RF = ee.Classifier.randomForest(10).train(training, 'label', bands);
// var classified_RF = SVix.classify(classifier_RF);

// Map.addLayer(classified_RF, { //.clip(geometry3)
//       "min": 0,
//       "max": 2,
//       "palette": "066311,86d6a4,e7b53b,"+
//                  "d0670f,c70000,482628," +
//                  "5b6c7f,ce54dd,2620e5",
//     "format": "png"
// },  'Class_RF',true);
