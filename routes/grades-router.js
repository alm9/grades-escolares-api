import { promises } from 'fs';
import express from 'express';
import { logger } from '../logs/winston.js';
const router = express.Router();

const readFile = promises.readFile;
const writeFile = promises.writeFile;
global.file = './grades.json';

/** Consultar todas as grades */
router.get('/', async (_, res, next) => {
  try {
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    delete data.nextId; //propriedade nextId é interna da API
    res.send(data);
    logger.info(`GET / (TODAS AS GRADES)`);
  } catch (error) {
    logger.error(`GET / (TODAS AS GRADES) - ${error}`);
    next(error);
  }
});

/** Consultar grade por id
 * @param id Id number for search
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    const findId = data.grades.find((el) => el.id === id);
    if (findId === undefined) {
      res.send(`Não há grade com id ${id}, tente novamente`);
      logger.warn(`GET /${id} - Nenhuma grade com o índice digitado`);
    } else {
      res.send(findId);
      logger.info(`GET /${id} - ${JSON.stringify(findId)}`);
    }
  } catch (error) {
    logger.error(`GET /:id - ${error}`);
    next();
  }
});

/** Consultar a nota total de um aluno em uma disciplina.
 * @param student Student string for search
 * @param subject Subject string for search
 */
router.get('/total/:student/:subject', async (req, res, next) => {
  try {
    const student = req.params.student;
    const subject = req.params.subject;
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    const somaNotas = data.grades.reduce((acc, el) => {
      if (el.student === student && el.subject === subject) {
        return acc + el.value;
      }
      return acc;
    }, 0);
    res.send(`${student} obteve ${somaNotas} em ${subject}`);
    logger.info(`GET /total /${student} /${subject} - total = ${somaNotas}`);
  } catch (error) {
    logger.error(`GET /total - ${error}`);
    next();
  }
});

/** Consultar a nota total de um aluno em uma disciplina.
 * @param subject Subject string for search
 * @param type Type string for search
 */
router.get('/media/:subject/:type', async (req, res, next) => {
  try {
    const subject = req.params.subject;
    const type = req.params.type;
    let count = 0;
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    const somaNotas = data.grades.reduce((acc, el) => {
      if (el.type === type && el.subject === subject) {
        count++;
        return acc + el.value;
      }
      return acc;
    }, 0);
    const media = somaNotas / count;
    res.send(`Matéria "${subject}" com tipo "${type}" tem a média ${media}`);
    logger.info(`GET /media /${subject} /${type} - média = ${media}`);
  } catch (error) {
    logger.error(`GET /media - ${error}`);
    next();
  }
});

/** Consultar as três melhores grades de acordo com subject e type
 * @param subject Subject string for search
 * @param type Type string for search
 */
router.get('/melhores/:subject/:type', async (req, res, next) => {
  try {
    const limit = 3;
    const subject = req.params.subject;
    const type = req.params.type;
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    let search = data.grades.filter((el) => {
      if (el.type === type && el.subject === subject) {
        return el;
      }
    });
    search = search.sort((a, b) => {
      return b.value - a.value;
    });
    search.splice(limit);
    res.send(search);
    logger.info(`GET /melhores /${subject} /${type}`);
  } catch (error) {
    logger.error(`GET /melhores - ${error}`);
    next();
  }
});

/** Criar uma grade */
router.post('/', async (req, res, next) => {
  try {
    let grade = req.body;
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    grade = { id: data.nextId++, ...grade, timestamp: new Date() };
    data.grades.push(grade);
    writeFile(global.file, JSON.stringify(data));
    res.send(
      `Grade ${grade.id} inserida em ${grade.timestamp
        .toString()
        .substring(0, grade.timestamp.toString().indexOf('G'))}`
    );
    logger.info(`POST / - id ${grade.id} - ${JSON.stringify(grade)}`);
  } catch (error) {
    logger.error(`POST / - ${error}`);
    next();
  }
});

/** Atualizar uma grade */
router.put('/', async (req, res, next) => {
  /** Função que recebe dois objetos. O primeiro será substituído pelo segundo.
   * Contudo, permanecerão os dados do segundo objeto que não haja no primeiro.
   * @param oldObj Objeto antigo, que será substituído
   * @param newObj Objeto que substituirá o antigo, mas receberá dados faltantes
   */
  function mergeObjs(oldObj, newObj) {
    let mergedObjs = {};
    for (var propriedade in oldObj) {
      if (!newObj.hasOwnProperty(propriedade)) {
        mergedObjs[propriedade] = oldObj[propriedade];
      } else mergedObjs[propriedade] = newObj[propriedade];
    }
    return mergedObjs;
  }
  try {
    const newGrade = req.body;
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    const indexGrade = data.grades.findIndex((oldG) => oldG.id === newGrade.id);
    if (indexGrade === -1) {
      res.send(`Não há grade com índice ${newGrade.id}, cuidado`);
      logger.warn(`PUT / - Nenhuma grade com o índice ${newGrade.id} digitado`);
      return;
    }
    const oldGrade = data.grades[indexGrade];
    const mergedGrade = mergeObjs(oldGrade, newGrade);
    data.grades[indexGrade] = {
      ...mergedGrade,
      timestamp: data.grades[indexGrade].timestamp,
    };
    writeFile(global.file, JSON.stringify(data));
    res.send(`Grade de id ${newGrade.id} atualizada`);
    logger.info(
      `PUT / - Valores antigos: ${JSON.stringify(oldGrade)}
       Atualizado: ${JSON.stringify(newGrade)}`
    );
  } catch (error) {
    logger.error(`PUT / - ${error}`);
    next();
  }
});

/** Deletar uma grade */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = JSON.parse(await readFile(global.file, 'utf-8'));
    const gradeToDelete = data.grades.find((el, index) => {
      if (el.id === id) {
        el.id = index;
        return el;
      }
    });
    if (gradeToDelete === undefined) {
      res.send(`Não há grade com id ${id}, tenha cuidado`);
      logger.warn(`DELETE /${id} - Nenhuma grade com o índice digitado}`);
      return;
    }
    data.grades.splice(gradeToDelete.id, 1); //nao funciona em alguns navegadores antigos
    writeFile(global.file, JSON.stringify(data));
    delete gradeToDelete.id; //apenas para exibir ao usuário
    res.send(`A seguinte grade foi excluída: ${JSON.stringify(gradeToDelete)}`);
    logger.info(`DELETE /${id} - ${JSON.stringify(gradeToDelete)}`);
  } catch (error) {
    logger.error(`DELETE /:id - ${error}`);
    next();
  }
});

export default router;
