import clientPromise from '../../../lib/mongodb';
let ObjectId = require('mongodb').ObjectId;
import getUserInfo from '../../../lib/auth';
import getUserDataUsage from '../../../lib/usageLimit';

export default async function fetchTemplateRecords(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME | 'yobulk');
  const userData = await getUserInfo(req)

  switch (req.method) {
    case 'GET':
      try {
        const usage = await getUserDataUsage(userData.email);
        let results = await db
          .collection('templates')
          .find({$and: [{ template_name: { $exists: false }}, {user: userData.email}]})
          .toArray();
        for (const item of results) {
          const recordsCount = await db
            .collection(item.collection_name)
            .countDocuments({});
          const validData = await db
            .collection(item.collection_name)
            .find({ 'validationData.0': { $exists: false } })
            .count();
          let importerDetails = await db
            .collection('importers')
            .findOne({templateId: item.baseTemplateId})
          item.importerId = importerDetails?._id
          item.orgId = importerDetails?.organizationId
          item.rows = validData;
          item.status = (recordsCount === validData) ? 'Complete' : 'Incomplete'; 
        }
        res.send(results);
      } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'failed to load data' });
      }
      break;
  }
}
