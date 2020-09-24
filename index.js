const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {

    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const bucketName = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    let srcKeyPrefix = srcKey.split('.').slice(0, -1).join('.');
    let extension = srcKey.substring(srcKey.indexOf(".") + 1);

    console.log("Source Key: " + srcKey);
    const dstKey = srcKey.replace('original', 'thumbnail');
    console.log("Destination Key: " + dstKey);


    // Check that the image type is supported
    const imageType = extension;
    if (imageType !== "jpg" && imageType !== "jpeg" && imageType !== "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

    // Download the image from the S3 source bucket.
    console.log("Downloading original file");
    try {
        const params = {
            Bucket: bucketName,
            Key: srcKey
        };
        var origimage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
    const width  = 200;

    // Use the Sharp module to resize the image and save in a buffer.
    console.log("Processing...");

    try {
        var buffer = await sharp(origimage.Body)
            .resize({width: width})
            .toBuffer();

    } catch (error) {
        console.log(error);
        return;
    }

    // Upload the thumbnail image to the destination bucket
    try {
        const destparams = {
            Bucket: bucketName,
            Key: dstKey,
            Body: buffer,
            ContentType: "image"
        };

        console.log("Saving...");
        const putResult = await s3.putObject(destparams).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    console.log('Successfully resized ' + bucketName + '/' + srcKey +
        ' and uploaded to ' + bucketName + '/' + dstKey);
};
