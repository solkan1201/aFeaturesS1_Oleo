
var geom = ee.Geometry([
    [8.994245752598399,43.23009348370389], 
    [9.486570581699961,43.23009348370389], 
    [9.486570581699961,43.45680462038073], 
    [8.994245752598399,43.45680462038073], 
    [8.994245752598399,43.23009348370389]
])

var descriptoresIndex = function(img, bnd){

    var glcm = SVix.select(bnd).glcmTexture({size: 6});
    print("glcm", glcm) 


    return img.addBands(glcm)
}




var pmtros = {
    asset_imgAn: {
        '0': 'COPERNICUS/S1_GRD/S1B_IW_GRDH_1SDV_20181008T172145_20181008T172210_013064_01822C_B07F',
        '1': 'COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20181008T052757_20181008T052822_024040_02A081_CA4D'
    }, 
    ascVH: ['ASCENDING', 'DESCENDING'],
    ascedente: true,
    bandas: ['VV', 'VH']
}

if (pmtros.ascedente === true){
    var imgA = '0';    
}else{var imgA = '1';}


var SVix = ee.Image(pmtros.asset_imgAn[imgA])
SVix = SVix.clip(geom)

var imgAllFeat = descriptoresIndex(SVix, pmtros.bandas['VV'])
