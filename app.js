/* DESAFIO do Módulo 2 - Bootcamp Desenvolvedor FULL STACK - IGTI
 * Criação de uma API para controle de grades escolares
 * Autor: André de Lima Machado
 */
import express from 'express';
import gradesRouter from './routes/grades-router.js';
import { logger } from './logs/winston.js';

const app = express();
const port = 3002;

app.use(express.json()); //manda o Express reconhecer requisições que chegarem como objeto JSON
// servir o conteúdo estático da pasta “public”:
app.use(express.static('public'));
app.use('/', gradesRouter);

app.listen(port, async (req, res) => {
  // logger.error('Teste inicial - Assim exibe o ERROR log.');
  // logger.warn('Teste inicial - Assim exibe o WARN started.');
  logger.info('API started.');
});
