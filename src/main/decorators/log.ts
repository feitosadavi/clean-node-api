import { LogErrorRepository } from '../../data/protocols/log-error-repository'
import { Controller, HttpRequest, HttpResponse } from '../../presentation/protocols'

// com o decorator eu adiciono um comportamento ao controlador, sem modificar o controlador
// A classe que vamos decorar, deve do mesmo tipo da classe que estamos implementando ou herdando
export class LogControllerDecorator implements Controller {
  private readonly controller: Controller
  private readonly logErrorRepository: LogErrorRepository

  constructor (controller: Controller, logErrorRepository: LogErrorRepository) {
    this.controller = controller
    this.logErrorRepository = logErrorRepository
  }

  async handle (httpRequest: HttpRequest): Promise<HttpResponse> {
    const httpResponse = await this.controller.handle(httpRequest)
    if (httpResponse.statusCode === 500) await this.logErrorRepository.log(httpResponse.body.stack)
    return httpResponse
  }
}
