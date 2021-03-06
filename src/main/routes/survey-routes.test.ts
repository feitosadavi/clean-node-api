import { MongoHelper } from '@/infra/db/mongodb/helpers/mongo-helper'
import { mockSurveysParams } from '@/domain/test'
import { Collection, InsertOneWriteOpResult } from 'mongodb'
import request from 'supertest'
import { sign } from 'jsonwebtoken'
import app from '../config/app'
import env from '../config/env'

let surveysCollection: Collection
let accountsCollection: Collection

describe('Survey Routes', () => {
  beforeAll(async () => {
    await MongoHelper.connect(process.env.MONGO_URL)
  })

  afterAll(async () => {
    await MongoHelper.disconnect()
  })

  beforeEach(async () => {
    surveysCollection = await MongoHelper.getCollection('surveys')
    accountsCollection = await MongoHelper.getCollection('accounts')
    await surveysCollection.deleteMany({})
    await accountsCollection.deleteMany({})
  })

  const insertAccount = async (): Promise<InsertOneWriteOpResult<any>> => {
    return accountsCollection.insertOne({
      name: 'Carlos',
      email: 'carlos@gmail.com',
      password: '123',
      role: 'admin'
    })
  }

  const updateAccountToken = async (id: string, accessToken: string): Promise<void> => {
    await accountsCollection.updateOne({
      _id: id
    }, {
      $set: {
        accessToken
      }
    })
  }

  const insertSurvey = async (): Promise<InsertOneWriteOpResult<any>> => {
    return surveysCollection.insertOne({
      question: 'Qual é o seu animal preferido?',
      answers: [
        {
          image: 'papagaio.png',
          answer: 'papagaio'
        },
        { answer: 'jacaré' }
      ],
      date: new Date()
    })
  }

  describe('POST /surveys', () => {
    test('Should return 403 on add survey without accessToken ', async () => {
      await request(app)
        .post('/api/surveys')
        .send(mockSurveysParams())
        .expect(403)
    })

    test('Should return 204 on add survey success ', async () => {
      const res = await insertAccount()
      const id = res.ops[0]._id
      const accessToken = sign({ id }, env.secret)
      await updateAccountToken(id, accessToken)
      await request(app)
        .post('/api/surveys')
        .set('x-access-token', accessToken) // na requisição, eu coloco o accessToken nos headers
        .send(mockSurveysParams()[0])
        .expect(204)
    })

    test('Should return 403 if user do not have an admin role', async () => {
      const res = await accountsCollection.insertOne({
        name: 'Carlos',
        email: 'carlos@gmail.com',
        password: '123'
      })
      const id = res.ops[0]._id
      const accessToken = sign({ id }, env.secret)
      await updateAccountToken(id, accessToken)
      await request(app)
        .post('/api/surveys')
        .set('x-access-token', accessToken)
        .send(mockSurveysParams())
        .expect(403)
    })
  })

  describe('GET /surveys', () => {
    test('Should return 204 if surveys collection is empty', async () => {
      await request(app)
        .get('/api/surveys')
        .send()
        .expect(204)
    })

    test('Should return 200 on load survey success', async () => {
      await surveysCollection.insertMany([
        { ...mockSurveysParams()[0] },
        { ...mockSurveysParams()[1] }
      ])
      await request(app)
        .get('/api/surveys')
        .send()
        .expect(200)
    })
  })

  describe('PUT /surveys/:surveyId/results', () => {
    test('should 403 on save survey without token ', async () => {
      await request(app)
        .put('/api/surveys/any_survey_id/results')
        .send()
        .expect(403)
    })

    test('should 200 on save survey success', async () => {
      const resAccount = await insertAccount()
      const resSurvey = await insertSurvey()

      const accountId = resAccount.ops[0]._id
      const accessToken = sign({ accountId }, env.secret)

      await updateAccountToken(accountId, accessToken)
      await request(app)
        .put(`/api/surveys/${resSurvey.ops[0]._id}/results`)
        .set('x-access-token', accessToken)
        .send({
          answer: 'papagaio'
        })
        .expect(200)
    })
  })
})
