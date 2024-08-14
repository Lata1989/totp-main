import express from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
app.use(express.json());

// Variables de entorno
const Port = process.env.PORT || 3000;
const DB_Url = process.env.URLDB;
const dbName = "TOTP";
const collectionName = "PasswordsTOTP";

//Conexion a BD
const client = new MongoClient(DB_Url);



client.connect()
  .then(() => {
    console.log("Conexión a BD exitosa.");
    app.listen(Port, () => {
      console.log(`Server en port ${Port}.`);
    });
  })
  .catch(err => {
    console.error("Error al conectar a la BD:", err);
  });


app.get('/', (req, res) => {
  res.send('Hola!!!');
});

// Listo
app.post('/generate-qr', async (req, res) => {
  // const { appName, email } = req.body;
  let { appName, email } = req.body;

  appName = "UnaApp";
  email = "latitargaming@gmail.com";

  if (!appName || !email) {
    return res.status(400).json({ error: "AppName y email son requeridos." });
  }

  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  // Generar un nuevo secret
  const secret = speakeasy.generateSecret({ length: 20 });
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: `app:${email}`,
    issuer: appName,
    encoding: 'base32'
  });

  try {
    // Busco si ya existe un registro con el mismo appName y email
    const existingRecord = await collection.findOne({ appName, email });

    if (existingRecord) {
      // Si existe, actualizar el secret y el updatedAt
      await collection.updateOne(
        { appName, email },
        {
          $set: {
            secret: secret.base32,
            otpauthUrl,
            updatedAt: new Date()
          }
        }
      );
      console.log("Registro actualizado en la BD.");
    } else {
      // Si no existe, crear un nuevo registro con createdAt y updatedAt
      await collection.insertOne({
        appName,
        email,
        secret: secret.base32,
        otpauthUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Nuevo registro guardado en la BD.");
    }

    // Generar el QR y devolverlo al cliente
    qrcodeTerminal.generate(otpauthUrl, { small: true }, function (qrcode) {
      console.log('QR:');
      console.log(qrcode);
    });

    qrcode.toDataURL(otpauthUrl, (err, data_url) => {
      if (err) {
        res.status(500).json({ error: 'Error generando QR' });
      } else {
        res.json({ secret: secret.base32, qrcode: data_url });
      }
    });
  } catch (err) {
    console.error("Error al guardar el secret en la BD:", err);
    res.status(500).json({ error: "Error al guardar el secret en la BD." });
  }
});

// Listo
app.post('/verify-totp', async (req, res) => {
  const { token, appName, email } = req.body;

  if (!appName || !email) {
    return res.status(400).send('appName y email son requeridos.');
  }

  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Buscar el secret en la base de datos
    const record = await collection.findOne({ appName, email });

    if (!record) {
      return res.status(400).send('No se encontró ningún registro para la appName y email proporcionados.');
    }

    const verified = speakeasy.totp.verify({
      secret: record.secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      res.send('🤙🏼🤙🏼🤙🏼🤙🏼');
    } else {
      res.status(400).send('👎🏼👎🏼👎🏼👎🏼');
    }
  } catch (err) {
    console.error("Error al verificar TOTP:", err);
    res.status(500).send('Error al verificar TOTP.');
  }
});

// Listo
app.get('/generate-totp', async (req, res) => {
  let { appName, email } = req.query;
  appName = "UnaApp";
  email = "latitargaming@gmail.com";

  if (!appName || !email) {
    return res.status(400).send('appName y email son requeridos.');
  }

  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Buscar el secret en la base de datos
    const record = await collection.findOne({ appName, email });

    if (!record) {
      return res.status(400).send('No se encontró ningún registro para la appName y email proporcionados.');
    }

    const token = speakeasy.totp({ secret: record.secret, encoding: 'base32' });
    res.json({ token });
  } catch (err) {
    console.error("Error al generar TOTP:", err);
    res.status(500).send('Error al generar TOTP.');
  }
});


/*
let secret;

app.get('/', (req,res) =>{
  res.send('Hola!!!');
})

*/
// Original Raul
/*
app.get('/generate-qr', (req, res) => {
  secret = speakeasy.generateSecret({ length: 20 });
  console.log("secret: ", secret);
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: 'app:johndoe@gmail.com', 
    issuer: 'empresa', 
    encoding: 'base32'
  });
  console.log("otpauthUrl: ", otpauthUrl)
  
  //TODO: Guardar secret en BD
  
  
  qrcodeTerminal.generate(otpauthUrl, { small: true }, function (qrcode) {
    console.log('QR');
    console.log(qrcode);
  });

  qrcode.toDataURL(otpauthUrl, (err, data_url) => {
    if (err) {
      res.status(500).json({ error: 'Error generando QR' });
    } else {
      res.json({ secret: secret.base32, qrcode: data_url });
    }
  });
});
*/
/*
app.get('/generate-qr', async (req, res) => {
  secret = speakeasy.generateSecret({ length: 20 });
  console.log("secret: ", secret);

  const email = 'johndoe@gmail.com';
  const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `app:${email}`, 
      issuer: 'empresa', 
      encoding: 'base32'
  });
  console.log("otpauthUrl: ", otpauthUrl);

  // Guardar el secret en la BD
  try {
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      
      await collection.insertOne({
          email: email,
          secret: secret.base32,
          otpauthUrl: otpauthUrl
      });
      
      console.log("Secret guardado en la BD.");
  } catch (error) {
      console.error("Error al guardar el secret en la BD:", error);
      return res.status(500).json({ error: 'Error al guardar el secret en la BD' });
  }

  qrcodeTerminal.generate(otpauthUrl, { small: true }, function (qrcode) {
      console.log('QR');
      console.log(qrcode);
  });

  qrcode.toDataURL(otpauthUrl, (err, data_url) => {
      if (err) {
          res.status(500).json({ error: 'Error generando QR' });
      } else {
          res.json({ secret: secret.base32, qrcode: data_url });
      }
  });
});
*/
/*
app.post('/verify-totp', (req, res) => {
  const { token } = req.body;

  if (!secret) {
    return res.status(400).send('Secret no definido. Generar QR primero.');
  }

  const verified = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: token
  });

  if (verified) {
    res.send('🤙🏼🤙🏼🤙🏼🤙🏼');
  } else {
    res.status(400).send('👎🏼👎🏼👎🏼👎🏼');
  }
});

app.get('/generate-totp', (req, res) => {
    if (!secret) {
      return res.status(400).send('Secret no definido. Generar QR primero.');
    }
    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    res.json({ token });
  });

*/