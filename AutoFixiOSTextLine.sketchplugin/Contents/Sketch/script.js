
// 下面这个几个函数获取一整段字符串的富文本属性：字体 字号 颜色 段格式 字体高度等等
function attrbutesFromString(string) {

  var str = string
  if ([string isKindOfClass:[MSAttributedString class]]) {
    str = string.attributedString()
  }
  return  str.attributesAtIndex_effectiveRange(0, nil)
}
//从上面取出来字体
function getFontFromAttributedString(string) {
  var dict = attrbutesFromString(string)
  return dict["NSFont"]
}
//从上面得到的是段落格式
function getParagraphStyleFromAttributedString(string) {
  var dict = attrbutesFromString(string)
  return dict["NSParagraphStyle"]
}

//返回的字体行高
function getLineHeight(font) {
  return font.ascender() - font.descender() + font.leading()
}

// 这个函数获取某个图层的最上层的 MSTextLayer 和 MSShapeGroup类型的子图层
function getMaskAndTextLayer(group) {
  var children = group.children()
  var textLayer = nil
  var shape = nil
  for (var i=0; i<children.count(); i++) {
    var obj = children[i]
    if ([obj isKindOfClass:[MSTextLayer class]]) {
      textLayer = obj
    }
    if ([obj isKindOfClass:[MSShapeGroup class]]) {
      shape = obj
    }
  }
  return [shape, textLayer]
}

// 这个函数获取字体的上线边距  就是整个字体绘制的高度减去字体真实的高度，不支持SF字体族，否则会出现第一行的弹窗
function getFixMargin(textLayer) {
  var attributedString = textLayer.attributedString().attributedString()
  var style = getParagraphStyleFromAttributedString(attributedString)
  var minimuxLineHeight = style.minimumLineHeight()
  var font = textLayer.font()
  var lineHeight = getLineHeight(font)
  var margin = (minimuxLineHeight - lineHeight) / 2
  return margin
}
// 这个函数会去掉文本图层的垂直方向的边距
function trimVerticalMargin(textLayer, margin) {
  var originalFrame = textLayer.frame().rect()
  var originalCenter = textLayer.center()

  var targetFrame = originalFrame
  targetFrame.size.height -= margin * 2
  targetFrame.size.height = Math.ceil(targetFrame.size.height)

  var rect = MSShapeGroup.shapeWithRect(targetFrame)
  textLayer.parentGroup().addLayer(rect)

  var layers = MSLayerArray.arrayWithLayers([rect, textLayer]])
  var group = MSMaskWithShape.createMaskWithShapeForLayers(layers)
  group.center = originalCenter
  textLayer.frame().y = -margin
}
// 这个函数会调用上面的方法 把传入的文本图层或者文本图层组的边距去掉
function fixMargin(layer) {
  if ([layer isKindOfClass:[MSTextLayer class]]) {

    // chose textLayer directly
    var textLayer = layer;
    var margin = getFixMargin(textLayer)
    if (margin <= 0) {
      return
    }
    var group = trimVerticalMargin(textLayer, margin)

  } else if ([layer isKindOfClass:[MSLayerGroup class]]) {

    // resize grouped
    var group = layer
    var list = getMaskAndTextLayer(group)
    var textLayer = list[1]
    var shape = list[0]
    var margin = getFixMargin(textLayer)
    if (shape == nil || textLayer == nil) {
      return
    }
    shape.frame().x = 0
    shape.frame().y = 0
    shape.frame().width = textLayer.frame().width()
    shape.frame().height = Math.ceil(textLayer.frame().height() - margin * 2)
    textLayer.frame().x = 0
    textLayer.frame().y = -margin
    group.resizeToFitChildrenWithOption(0)
    group.name = textLayer.name()
  }
}

//这里开始修复运行
function onFixRun(context) {
  // var document = context.document
  // document.displayMessage("Dynamic Button")

  var selection = context.selection;
  for (var i=0; i<selection.count(); i++) {
    var layer = selection[i]
    fixMargin(layer)
  }
};

// 这个函数会把文本图层的每行文字的高度乘以lineHeigthMutiple 并设置成字体的真实高度
function setLineHeight(textLayer) {
  var font = textLayer.font()
  var lineHeight = getLineHeight(font)
  var attrString = textLayer.attributedString()
  var pointSize = getFontFromAttributedString(attrString).pointSize()
  // sketch only render in integer line height
  var FontSize = parseInt(pointSize)
  var mod = FontSize % 10
  if (0 == mod) {
    lineHeight = FontSize + 2 * parseInt(FontSize / 10)
  } else {
    lineHeight = FontSize + 2 * parseInt(FontSize / 10 + 1)
  }
  let finalHeight = lineHeight
  textLayer.setLineHeight(finalHeight)
}

function onSetLineHeight(context) {
  var selection = context.selection;
  for (var i=0; i<selection.count(); i++) 
{
    var layer = selection[i];
    if ([layer isKindOfClass:[MSTextLayer class]]) 
    {
      setLineHeight(layer)
      fixMargin(layer)

    } else if ([layer isKindOfClass:[MSLayerGroup class]]) 
  {
      // resize grouped
      var group = layer
      var children = group.children()
      var textLayer = nil
      var shape = nil
      var s = ""
      for (var p in group) {
        s = s+"\n"+"p:"+group[p]
      }
      for (var i=0; i<children.count(); i++) 
      {
        var obj = children[i]
        if ([obj isKindOfClass:[MSTextLayer class]]) 
        {
          setLineHeight(obj)
          fixMargin(obj)
        }
        if ([obj isKindOfClass:[MSShapeGroup class]]) 
        {
          shape = obj
        }
      }
    }
  }
}