const jwt = require('jsonwebtoken');
const secret = 'ClaroSSO_Shared_Secret_2026_!#';
const payload = { test: 1 };
const token = jwt.sign(payload, secret);
try {
    jwt.verify(token, secret);
    console.log('Works');
} catch(e) {
    console.log(e.message);
}
