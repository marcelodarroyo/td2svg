//=============================================================================
// Simple text (ascii) diagrams to svg
// Author: Marcelo Arroyo (marcelo.arroyo@gmail.com)
// Date: 2023
//=============================================================================

function diagram2svg(text) {
    const fontSize = '12px';
    const fontFamily = 'monospace';
    // const cw = Math.round(characterWidth() * 10) / 10;
    const cw = 7;                   // svg character width box
    const ch = 12;                  // svg character height box
    const ns = 'xmlns="http://www.w3.org/2000/svg"';
    const style = extractStyle();   // extract style tag
    let   width = 0;                // diagram width
    let   lines = text.split('\n'); // iterate on lines of diagram
    let   polygons = [];            // polygons (with id/class)
    const shapes = idShapes();      // generate svg shapes
    const hl = horizontalLines();   // generate svg horizontal lines
    const vl = verticalLines();     // generate svg vertical lines
    const ca = crossAndArrows();    // generate svg cross and arrows
    const texts = genTexts();       // generate svg texts
    const w = (width+2) * cw;       // svg width
    const h = lines.length * ch;    // svg height
    const viewBox = `viewBox="0 0 ${w} ${h}"`;
    const svg = `<svg width="${w}" height="${h}" ${viewBox} ${ns}>\n`;

    function characterWidth() {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext("2d");
        ctx.font = `${fontSize} ${fontFamily}`;
        return ctx.measureText('M').width;
    }

    function rightOf(i, j) {
        return (j + 1 < lines[i].length) ? lines[i][j+1] : ' ';
    } 
        
    function leftOf(i, j) {
        return (j > 0) ? lines[i][j-1] : ' ';
    }
    
    function aboveOf(i, j) {
        return (i > 0 && j < lines[i-1].length) ? lines[i-1][j] : ' ';
    }

    function belowOf(i, j) {
        return (i + 1 < lines.length && j < lines[i+1].length) ? 
                lines[i+1][j] : ' ';
    }

    function isVertical(c) {
        return c == '|'|| c == '^' || c == '+' || c == 'v';
    }

    // is d[i,j] a rectangle top right corner?
    function isTRC(i, j) {
        return (lines[i][j] == '+' || lines[i][j] == '.') && rightOf(i,j) != '-';
    }

    // is d[i,j] a rectangle bottom left corner?
    function isBLC(i, j) {
        return (lines[i][j] == '+' || lines[i][j] == "'") && rightOf(i,j) == '-';
    }

    // extract <style>...</style> from diagram text
    function extractStyle() {
        let match = text.match(/\n *<style> *\n/);
        let result = '';
        if (match) {
            result = text.substring(match.index);
            text = text.substring(0, match.index);
        }
        return result;
    }

    // Generate svg text elements
    function genTexts() {
        let ta = 'dominant-baseline="middle" '; 
        let texts = '';
        let re = /([a-z0-9\(_\[\$.]\S*)|( [+-] )/ig;
        ta += `font-size="${fontSize}" font-family="${fontFamily}"`;
        for (let i = 0; i < lines.length; i++) {
            re.lastIndex = 0;
            let match;
            while ( match = re.exec(lines[i]) ) {
                const j = match.index;
                const isArrow = match[0] == 'v' && isVertical(aboveOf(i, j));
                if (!isArrow) {
                    const s = match[0],
                          x = j * cw, 
                          y = i * ch + (ch / 2);
                    texts += `<text x="${x}" y="${y}" ${ta}>${s}</text>\n`;
                }
            }
        }
        return texts;
    }

    // generate shapes (rectangles for now) with identifiers
    function idShapes() {
        let shapes = '';
        for (let i = 0; i < lines.length; i++) {
            let rule = /\|([#.]\S+)/g;
            let match;
            while ( match = rule.exec(lines[i]) ) {
                const id = match[1].substring(1),
                      x1 = match.index,
                      y1 = i-1;
                let x2 = x1 + match[0].length,
                    y2 = i + 1;
                while (x2 < lines[i].length && !isTRC(i-1,x2))
                    x2++;
                while (y2 < lines.length && !isBLC(y2,x1))
                    y2++;
                const ic = match[1][0] == '#' ? 'id' : 'class';
                const r = `<rect stroke="black" ${ic}="${id}" `;
                const x = x1 * cw + cw / 2;
                const y = i * ch - ch / 2;
                const w = (x2 - x1) * cw;
                const h = (y2 - y1) * ch;
                shapes += `${r} x="${x}" y="${y}" width="${w}" height="${h}"/>\n`;
                const spaces = ' '.repeat(match[1].length);
                lines[i] = lines[i].replace(match[1], spaces);
                polygons.push({x1: x1, y1: y1, x2: x2, y2: y2});
            }
        }
        return shapes;
    }

    // detect the type of line connector +
    function crossAndArrows() {
        let r = '';
        const p = '<path stroke="black" d=';

        for (let i=0; i < lines.length; i++) {
            let re = /[+><^v\\/]/g;
            let m; 
            while (m = re.exec(lines[i])) {
                const j = m.index;
                const c = lines[i][j];
                const x1 = j * cw;
                const y1 = i * ch;
                const x2 = x1 + cw;
                const y2 = y1 + ch;
                const ym = y1 + ch/2;
                const xm = x1 + cw/2;
                const right = rightOf(i, j);
                const left  = leftOf(i, j);
                const above = aboveOf(i, j);
                const below = belowOf(i, j);

                if (c == '+') {
                    if (left == '-' && right == '-' && 
                        isVertical(above) && isVertical(below)) {
                        // cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && right == '-' && isVertical(above)) {
                        // bottom cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${ym} V ${y1}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && right == '-' && isVertical(below)) {
                        // top cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${ym} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (right == '-' && isVertical(above) && isVertical(below)) {
                        // right cross
                        const d = `M ${xm},${ym} H ${x2} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && isVertical(above) && isVertical(below)) {
                        // cross left
                        const d = `M ${x1},${ym} H ${xm} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (right == '-' && (below == '|' || below == '+')) {
                        // top-left corner
                        const d = `M ${xm},${y2} V ${ym} H ${x2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (left  == '-' && (below == '|' || below == '+')) {
                        // top-right corner
                        const d = `M ${x1},${ym} H ${xm} V ${y2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (right == '-' && (above == '|' || above == '+')) {
                        // bottom-left corner
                        const d = `M ${xm},${y1} V ${ym} H ${x2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (left  == '-' && (above == '|' || above == '+')) {
                        // bottom-right corner
                        const d = `M ${x1},${ym} H ${xm} V ${y1}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                }
                if (c == '>' && left == '-') {
                    const d = `M ${x1},${ym} L ${x1+2},${ym} M ${x1+2},${y1+2} L ${x2+3},${ym} L ${x1+2},${y2-2} Z`;
                    r += `${p}"${d}" fill="black" />\n`;
                    continue;
                }
                if (c == '<' && right == '-') {
                    const d = `M ${x2},${ym} L ${x2-2},${ym} M ${x2-2},${y1+2} L ${x1-3},${ym} L ${x2-2},${y2-2} Z`;
                    r += `${p}"${d}" fill="black" />\n`;
                    continue;
                }
                if (c == '^' && isVertical(below)) {
                    const d = `M ${xm},${y2} L ${xm},${y2-3} M ${x1},${y2-3} L ${xm},${y1-3} L ${x2},${y2-3} Z`;
                    r += `${p}"${d}" fill="black" />\n`;
                    continue;
                }
                if (c == 'v' && isVertical(above)) {
                    const d = `M ${xm},${y1} L ${xm},${y1+3} M ${x1},${y1+3} L ${x2},${y1+3} L ${xm},${y2+3} Z`;
                    r += `${p}"${d}" fill="black" />\n`;
                    continue;
                }
                if (c == '\\' && isVertical(belowOf(i,j))) {
                    const d = `M ${x1},${ym} L ${xm},${y2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '/' && isVertical(aboveOf(i,j))) {
                    const d = `M ${x1},${ym} L ${xm},${y1}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
            }
        }
        return r;
    }

    // is character at position (i,j) on edge of some poligon?
    function onEdgeOfShape(i,j) {
        for (let p of polygons) {
            if ((i == p.y1 || i == p.y2) && j >= p.x1 && j <= p.x2)
                return true;    // in top or bottom edge
            if ((j == p.x1 || j == p.x2) && i >= p.y1 && i <= p.y2)
                return true;    // in left or right edge
        }
        return false;
    }

    function horizontalLines() {
        const l = '<line stroke="black"';
        const p = '<path stroke="black"';
        let r = '';
        for (let i=0; i < lines.length; i++) {
            if (lines[i].length > width) 
                width = lines[i].length;
            for (let j=0; j < lines[i].length; j++) {
                if (lines[i][j] == '-' && !onEdgeOfShape(i,j)) {
                    const x1 = j * cw;
                    const y = i * ch + ch/2;
                    let   x2 = x1 + cw;
                    j++;
                    while (lines[i].length > j && lines[i][j] == '-') {
                        x2 = ++j * cw;
                    }
                    r += `${l} x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>\n`;
                }
            }
        }
        return r;
    }

    function verticalLines() {
        const l = '<line stroke="black"';
        const p = '<path stroke="black"';
        let r = '';
        for (let j=0; j < width; j++) {
            for (let i=0; i < lines.length; i++) {
                if (j >= lines[i].length) continue;
                if (lines[i][j] == '|' && !onEdgeOfShape(i,j)) {
                    const x = j * cw + cw/2;
                    const y1 = i * ch;
                    let   y2 = y1 + ch;
                    while (++i < lines.length && lines[i][j] == '|')
                        y2 = (i+1) * ch;
                    r += `${l} x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>\n`;
                }
            }
        }
        return r;
    }

    return svg + shapes + hl + vl + ca + texts + style + '</svg>\n';
}

/*
const example1 = 
`
        +-------
        |
        v
  +------------+                   +------------+ \\
  |#a   r1     |<---------+------->|.b rect 2   | |
  +------------+          |        +------------+ |
         ^                +------->|.b   r3     | | blocks
         |                         +------------+ |
         |                         |.b   r4     | |
                                   +------------+ /

<style>
#a {fill: azure;}
.b {fill: yellow;}
</style>
`;

const example2 = `
  -+ 
   | 
`;

console.log( diagram2svg(example1) );
*/
