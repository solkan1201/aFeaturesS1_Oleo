
var img1 = ee.Image(1).clip(geometry)


// var allPolygon = ee.FeatureCollection(Nao_oleo)
// allPolygon = allPolygon.filterBounds(geometry2)

// var allPolygon = ee.FeatureCollection(Oleo_cRuido)
// allPolygon = allPolygon.filterBounds(geometry3)

var allPolygon = ee.FeatureCollection(oleo_sRuido);
allPolygon = allPolygon.filterBounds(geometry3);

var prmtSamples = {
  collection: allPolygon,
  properties: ['label'], 
  scale: 10,
  geometries: true
}

var pointROIs = img1.clip(geometry3).sampleRegions(prmtSamples)
print(pointROIs.aggregate_histogram('label'))
var assetsPoint = 'users/CartasSol/shapes/PointsControleOil'

var pmtoExp = {
  collection: pointROIs, 
  description: 'PointsControleOil', 
  assetId: assetsPoint
}
Export.table.toAsset(pmtoExp)
