var lsCoord = [[[8.994245752598399, 43.45680462038073],
                [8.994245752598399, 43.23009348370389],
                [9.486570581699961, 43.23009348370389],
                [9.486570581699961, 43.45680462038073]]];
var geometry = ee.Geometry.Polygon(lsCoord)
 /*         

var SVix = ee.ImageCollection("COPERNICUS/S1_GRD")
                .filterBounds(geometry)
                //.select('VV','VH')
                .filterMetadata('transmitterReceiverPolarisation', 'equals', ['VV', 'VH'])
                .filterDate('2018-10-08','2018-10-09')
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .map(function(img){return img.clip(geometry)})
                //.mosaic()

print(SVix)

var vhAscending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
print(vhAscending,"vhAscending")

var vhDescending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
print(vhDescending,"vhDescending")

*/


var param = {
    'assetROIs_OleNOle': 'users/CartasSol/shapes/PointsControleOil_NOle',
    'assetROIs_OleSR': 'users/CartasSol/shapes/PointsControleOil_OleSR',
    'assetROIs_OleCR': 'users/CartasSol/shapes/PointsControleOil_OleCR'
}

var featROIs = ee.FeatureCollection(param['assetROIs_OleNOle']).merge(
                        ee.FeatureCollection(param['assetROIs_OleSR'])).merge(
                        ee.FeatureCollection(param['assetROIs_OleCR']))

var vhDescending = ee.Image('COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20181008T052757_20181008T052822_024040_02A081_CA4D')
                      .clip(geometry)


Map.addLayer(vhDescending)
Map.addLayer(featROIs)
Map.centerObject(vhDescending)
