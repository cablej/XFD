import { S3 } from 'aws-sdk';
import * as https from 'https';

/**
 * S3 Client. Normally, interacts with S3.
 * When the app is running locally, connects
 * to local S3 (minio) instead.
 */
class S3Client {
  s3: S3;
  isLocal: boolean;

  constructor(isLocal?: boolean) {
    this.isLocal =
      isLocal ??
      (process.env.IS_OFFLINE || process.env.IS_LOCAL ? true : false);
    if (this.isLocal) {
      this.s3 = new S3({
        endpoint: 'http://minio:9000',
        s3ForcePathStyle: true
      });
    } else {
      const agent = new https.Agent({
        keepAlive: false
      });
      this.s3 = new S3({
        maxRetries: 3,
        httpOptions: { agent }
      });
    }
  }

  /**
   * Saves the given JSON file as a CSV file in S3, then returns a
   * temporary URL that can be used to access it.
   * @param data Data to be saved as a CSV
   */
  async saveCSV(body: string, name: string = '') {
    try {
      const Key = `${Math.random()}/${name}-${new Date().toISOString()}.csv`;
      const params = {
        Bucket: process.env.EXPORT_BUCKET_NAME!,
        Key,
        Body: body,
        ContentType: 'text/csv'
      };
      await this.s3.putObject(params).promise();
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.EXPORT_BUCKET_NAME!,
        Key,
        Expires: 60 * 5 // 5 minutes
      });

      // Do this so exports are accessible when running locally.
      if (this.isLocal) {
        console.log(url.replace('minio:9000', 'localhost:9000'));
        return url.replace('minio:9000', 'localhost:9000');
      }
      return url;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async exportReport(reportName: string, orgId: string) {
    try {
      const Key = `${orgId}/${reportName}`;
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.REPORTS_BUCKET_NAME!,
        Key,
        Expires: 60 * 5 // 5 minutes
      });
      // Do this so exports are accessible when running locally.
      if (this.isLocal) {
        return url.replace('minio:9000', 'localhost:9000');
      }
      return url;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async listReports(orgId: string) {
    try {
      const params = {
        Bucket: process.env.REPORTS_BUCKET_NAME!,
        Delimiter: '',
        Prefix: `${orgId}/`
      };

      const data = await this.s3
        .listObjects(params, function (err, data) {
          if (err) throw err;
        })
        .promise();
      return data.Contents;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async pull_daily_vs(filename: string) {
    console.log(process.env.VS_BUCKET_NAME);
    const params = {
      Bucket: 'vs-extracts',
      Key: filename
    };

    this.s3.headObject(params, (err, data) => {
      if (err) {
        if (err.code === 'NotFound') {
          console.log(
            `File "${filename}" does not exist in bucket vs-extracts.`
          );
        } else {
          console.error('Error:', err);
        }
      } else {
        console.log(`File "${filename}" exists in bucket vs-extracts.`);
      }
    });

    try {
      const data = await this.s3.getObject(params).promise();
      if (!data.Body) {
        throw new Error('Empty response from S3');
      }
      return Buffer.from(data.Body as ArrayBuffer); // Convert stream to Buffer
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  }

  async getEmailAsset(fileName: string) {
    try {
      const params = {
        Bucket: process.env.EMAIL_BUCKET_NAME!,
        Key: fileName
      };

      const data = await this.s3
        .getObject(params, function (err, data) {
          if (err) throw err;
        })
        .promise();
      if (data && data.Body) {
        return data.Body.toString('utf-8');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

export default S3Client;
