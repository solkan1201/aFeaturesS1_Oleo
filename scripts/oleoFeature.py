

import ee 
import math
import sys
try:
    ee.Initialize()
    print('The Earth Engine package initialized successfully!')
except ee.EEException as e:
    print('The Earth Engine package failed to initialize!')
except:
    print("Unexpected error:", sys.exc_info()[0])
    raise


def functExport (featCol, name):
    
    pmtoExpoAsset ={
      'collection': featCol,
      'description': name,
      'assetId': 'users/CartasSol/ROIs/' + name
    }    
    task = ee.batch.Export.table.toAsset(**pmtoExpoAsset)
    task.start()
    pmtoExporDriver ={
        'collection': featCol,
        'description': name,
        'folder': 'CSV'
    }
    task = ee.batch.Export.table.toDrive(**pmtoExporDriver)
    task.start()
    print("salvando as amostras ⚡⚡⚡ " + name + " ⚡⚡⚡")
    print("para o driver e para o Assets")

def create_norm_diff(image):
        
    ang = image.select(['angle']).multiply(3.14/180.0).cos().log10().multiply(10.0)
    VHa = image.select('VH').subtract(ang).rename("VH_ang")
    VVa = image.select('VV').subtract(ang).rename("VV_ang")    
    vhcorr = image.expression("float(b('VH') - b('VV')) / (b('VH') + b('VV'))").rename('vhcorr')
    
    return image.addBands(vhcorr).addBands(VHa).addBands(VVa)


param = {
    'assetROIs_OleNOle': 'users/CartasSol/shapes/PointsControleOil_NOle',
    'assetROIs_OleSR': 'users/CartasSol/shapes/PointsControleOil_OleSR',
    'assetROIs_OleCR': 'users/CartasSol/shapes/PointsControleOil_OleCR',
    'class': {
        '0': 0.1,
        '1': 0.8,
        '2': 1
    }
}

lsCoord = [[[9.470434412266368, 43.38811418505556],
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
        ]
geometry = ee.Geometry.Polygon(lsCoord)
          

#SVix = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(geometry).filterMetadata(
#                        'transmitterReceiverPolarisation', 'equals', ['VV', 'VH']).filterDate(
#                        '2018-10-08','2018-10-09').filter(ee.Filter.eq('instrumentMode', 'IW'))

#SVix = SVix.map(lambda img: img.clip(geometry))
#SVix = SVix.map(lambda img: create_norm_diff(img)) 


###  Filter to get images from different look angles.##
#vhAscending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
#print("vhAscending ", vhAscending.size().getInfo())
vhAscending = ee.Image('COPERNICUS/S1_GRD/S1B_IW_GRDH_1SDV_20181008T172145_20181008T172210_013064_01822C_B07F')
vhAscending = vhAscending.clip(geometry)
vhAscending = create_norm_diff(vhAscending)

#vhDescending = SVix.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
vhDescending = ee.Image('COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20181008T052757_20181008T052822_024040_02A081_CA4D')
vhDescending = vhDescending.clip(geometry)
vhDescending = create_norm_diff(vhDescending)

#print("vhDescending", vhDescending.bandNames().getInfo())

## Create a composite from means at different polarizations and look angles## 
SVixx = ee.Image.cat([
    vhAscending.select('VH'),
    #vhDescending.select('VH'),
    vhAscending.select('VV'),
    vhAscending.select('VH_ang'),
    vhAscending.select('VV_ang'),
    #vhDescending.select('VV'),
    vhAscending.select('vhcorr'),
    #vhDescending.select('vhcorr'),
    ee.ImageCollection([vhAscending.select('VV'), vhDescending.select('VV')]).mean().rename("VV_comp"),    
    ee.ImageCollection([vhAscending.select('vhcorr'), vhDescending.select('vhcorr')]).mean().rename("VHcorr_comp")    
])

print("mosaico com focal_median", SVixx.bandNames().getInfo())

#SVix = SVix.mosaic().addBands(SVixx.select(["VV_comp", 'VH_comp']));             
#print("SVix_composite", SVix.bandNames().getInfo())

#Map.setCenter(9.247881938228714, 43.41221619485682, 12)
#Map.addLayer(SVix.select("VV"), {min: -33, max: -12}, 'Image_VV', false)
#Map.addLayer(SVixx.select("VV_comp"), {min: -27, max: -18}, 'Image_VH_comp', false)
#Map.addLayer(SVix.select("VHcorr_comp"), {min: 0.05, max: 0.35}, 'Image_norm',false)


# ///////////////////////////////////////////////////////////////////////////
# //============================ Carrega amostras =======================////
# ///////// primeira coleta de dados ////////////////////////////////////////
featROIs0 = ee.FeatureCollection(param['assetROIs_OleNOle'])
featROIs1 = ee.FeatureCollection(param['assetROIs_OleSR'])
featROIs2 = ee.FeatureCollection(param['assetROIs_OleCR'])

featROIs0 =  featROIs0.randomColumn(columnName= 'random', distribution= 'normal')
featROIs1 =  featROIs1.randomColumn(columnName= 'random', distribution= 'normal')
featROIs2 =  featROIs2.randomColumn(columnName= 'random', distribution= 'normal')

newFeatROIs = featROIs0.filter(ee.Filter.lt('random', param['class']['0'])).merge(
                featROIs1.filter(ee.Filter.lt('random', param['class']['1']))).merge(
                featROIs2)

for kk, vv in newFeatROIs.aggregate_histogram('label').getInfo().items():
    print("classe {} : com {} pontos carregados".format(kk, vv))

bands = ['VV','VH','vhcorr',"VH_ang","VV_ang",'VV_comp','VHcorr_comp']

# // Overlay the points on the imagery to get training. ##
training = SVixx.select(bands).sampleRegions(
                                    collection= newFeatROIs, 
                                    properties= ['label'], 
                                    scale= 10,
                                    tileScale= 2,
                                    geometries= True
                                )

functExport(training, 'ptsROIs_Oleo_bndTransform')


#/////////////////////////////////////////////////////////////////
#//============== Gerando novas features  ======================//
#/////////////////////////////////////////////////////////////////
bndtoFeat = 'VV_comp'
SVixx= SVixx.toInt32()

## ///////////////////////////////////////////////////////////////////////////////////##
glcm = SVixx.select(bndtoFeat).glcmTexture(size= 6)
#//var glcm = SVix.select('VV').glcmTexture({size: 6})
print("glcm ", glcm.bandNames().getInfo())

#//var contrast = glcm.select('VV_contrast')
contrast = glcm.select(bndtoFeat + '_contrast')
#Map.addLayer(contrast,
#             {min: 0, max: 1500, palette: ['0000CC', 'CC0000']},
#             'contrast',false)

SVixx = SVixx.addBands(contrast)
print("contrast ", SVixx.bandNames().getInfo())

##/////////////////////////////////////////////////////////////////////////////////##
square = ee.Kernel.square(radius= 6)

#/ Compute entropy and display.
#//var entropy = SVix.select('VV').entropy(square).rename('entropy');
entropy = SVixx.select(bndtoFeat).entropy(square).rename(bndtoFeat + 'entropy')
print(entropy.bandNames().getInfo(),"entropy")

#Map.addLayer(entropy,
#             {min: 1, max: 5, palette: ['0000CC', 'CC0000']},
#             'entropy',false);
             
#/////////////////////////////////////////////////////////////////////////////////

listOne = [1, 1, 1, 1, 1, 1, 1, 1, 1]
centerList = [1, 1, 1, 1, 0, 1, 1, 1, 1]
lists = [listOne, listOne, listOne, listOne, centerList, listOne, listOne, listOne, listOne]
kernel = ee.Kernel.fixed(9, 9, lists, -4, -4, False)

#//var neighs = SVix.select('VV').neighborhoodToBands(kernel);
neighs = SVixx.select(bndtoFeat).neighborhoodToBands(kernel)

#//var gearys = SVix.select('VV').subtract(neighs).pow(2).reduce(ee.Reducer.sum())
gearys = SVixx.select(bndtoFeat).subtract(neighs).pow(2).reduce(ee.Reducer.sum())\
             .divide(math.pow(9, 2)).rename(bndtoFeat + 'gearys')

#Map.addLayer(gearys,
#             {min: 20, max: 2500, palette: ['0000CC', 'CC0000']},
#             "Geary's C",
#             false);
             
# //////////////////////////////////////////////////////////////////////////////////#
# //var xyGrad = SVix.select('VV').gradient();

xyGrad = SVixx.select(bndtoFeat).gradient()
gradient = xyGrad.select('x').pow(2)\
                        .add(xyGrad.select('y').pow(2)).sqrt().rename(bndtoFeat + 'gradient')

direction = xyGrad.select('y').atan2(xyGrad.select('x')).rename(bndtoFeat + 'direction')

#// Display the results.
#Map.addLayer(direction, {min: -2, max: 2, format: 'png'}, 'direction',false);
#Map.addLayer(gradient, {min: -7, max: 7, format: 'png'}, 'gradient',false);

# //////////////////////////////////////////////////////////////////////////////////#
# // Define a boxcar or low-pass kernel.
boxcar = ee.Kernel.square(radius= 7, units= 'pixels', normalize= True)

# // Smooth the image by convolving with the boxcar kernel.
# //var smooth = SVix.select('VV').convolve(boxcar).rename('vv_smooth');
smooth = SVixx.select(bndtoFeat).convolve(boxcar).rename(bndtoFeat + '_smooth')
print("smooth ", smooth.bandNames().getInfo())

# Map.addLayer(smooth, {min: -7, max: 7, format: 'png'}, 'smooth',false);
## //////////////////////////////////////////////////////////////////////// ##

laplacian = ee.Kernel.laplacian8(normalize= True )
# print("laplacian",laplacian.bandNames().getInfo()) # // Apply the edge-detection kernel.


# //var edgy = SVix.select('VV').convolve(laplacian).rename('edguy');
edgy = SVixx.select(bndtoFeat).convolve(laplacian).rename(bndtoFeat + 'edguy')
print("edgy", edgy.bandNames().getInfo())
# Map.addLayer(edgy, {min: -7, max: 7, format: 'png'}, 'edgy',false);

## ////======================================================////
##                  // Adicionando novas bandas ////

SVixx = SVixx.addBands(contrast)
# print(SVix,"contrast")
SVixx = SVixx.addBands(entropy)
#print(SVix,"entropy")
SVixx = SVixx.addBands(gearys)
#print(SVix,"gearys")
SVixx = SVixx.addBands(direction)
#print(SVix,"direction")
SVixx = SVixx.addBands(gradient)
#print(SVix,"gradient")
SVixx = SVixx.addBands(smooth)
#print(SVix,"smooth")
SVixx = SVixx.addBands(edgy)
#//print(SVix,"edgy")
#print(SVix,"Bandas")


bands = ['VV','VH','VV_comp','VHcorr_comp', bndtoFeat + '_contrast', bndtoFeat +'entropy',
            bndtoFeat + 'gearys', bndtoFeat + 'direction',bndtoFeat + '_smooth', 
            bndtoFeat +'gradient', bndtoFeat + 'edguy']

## // Overlay the points on the imagery to get training. ##
training = SVixx.select(bands).sampleRegions(
                                    collection= newFeatROIs, 
                                    properties= ['label'], 
                                    scale= 10,
                                    tileScale= 2,
                                    geometries= True
                                )
functExport(training, 'pointsROIs_Oleo')
