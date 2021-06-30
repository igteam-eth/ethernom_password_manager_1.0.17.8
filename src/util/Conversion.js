var Buffer = require('buffer/').Buffer;	

module.exports = class Conversion {
	constructor(props) {
	
	}

	convert_sn = (deviceSN) => {
    	//Original string XXXX | XXXX | XXXXXXXX
    	//Example: 0001 = 1
    	//Example: 0010 = 10
    	//Example: 0010 | 0002 | 00000010
    	//Final output: 10.2.10
		
		if(deviceSN == null || deviceSN.length != 16) return "";

        var fistSeries = deviceSN.slice(0, 4);
        var secondSeries = deviceSN.slice(4, 8);
        var thirdSeries = deviceSN.slice(8,17);

		fistSeries = fistSeries.replace(/^0+/, '');
		secondSeries = secondSeries.replace(/^0+/, '');
		thirdSeries = thirdSeries.replace(/^0+/, '');

		var string = ("SN: " + fistSeries + "." + secondSeries + "." + thirdSeries);
		
		//console.log("STRING DEVICES " + string);
		return string;
	
	}
	
	convert_bytes_to_int = (array) => {
		var val = 0;
		if(array.length == 1){
			return array[0];
		}
		
		var buf = Buffer.from(array);
		if(array.length == 2){
			val = buf.readUInt16LE(0);
		}else if(array.length == 4){
			val = buf.readUInt32LE(0);
		}		
		
		return val;
	}
}
