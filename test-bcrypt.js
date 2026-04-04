const bcrypt = require('bcryptjs');

const password = 'J#5ulOPCSbYYSOK#';
const hash = '$2a$10$IOywo88y3a1LSYhTcC.hzexxeuJbKYCbZOwOcMNYO4OXL/IDj5JIO';

async function test() {
  const match = await bcrypt.compare(password, hash);
  console.log('Password match:', match);
}

test();
