// @ts-nocheck
import React, { Component } from 'react'
import styles from './index.css'

type Props = {
  appPayload: string
}

type State = {
  loading: boolean
  error: string | null
  dinelcoData: any
}

interface DinelcoPayload {
  token: string
  paymentId: string
  sessionId: string
  environment: 'sandbox' | 'production'
  validateUrl: string
  amount: number
  currency: string
}

class DinelcoPaymentApp extends Component<Props, State> {
  iframeRef: React.RefObject<HTMLIFrameElement>
  formRef: React.RefObject<HTMLFormElement>
  
  constructor(props: Props) {
    super(props)
    this.state = {
      loading: true,
      error: null,
      dinelcoData: null,
    }

    this.iframeRef = React.createRef()
    this.formRef = React.createRef()
  }

  componentDidMount() {

    window.$(window).trigger('removePaymentLoading.vtex')
    

    this.processDinelcoPayload()
    

    window.addEventListener('message', this.handleDinelcoMessage)
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleDinelcoMessage)
  }

  processDinelcoPayload = () => {
    try {
      const dinelcoData: DinelcoPayload = JSON.parse(this.props.appPayload)
      
      console.log('🎯 Dinelco Payment App iniciada:', {
        paymentId: dinelcoData.paymentId,
        sessionId: dinelcoData.sessionId,
        environment: dinelcoData.environment,
        amount: dinelcoData.amount,
        currency: dinelcoData.currency,
        hasToken: !!dinelcoData.token,
      })

      // Validar que tenemos todos los datos necesarios
      if (!dinelcoData.token) {
        throw new Error('Missing integrityToken')
      }

      if (!dinelcoData.validateUrl) {
        throw new Error('Missing validateUrl')
      }
      
      this.setState({ 
        dinelcoData,
        loading: false 
      }, () => {

        setTimeout(this.submitDinelcoForm, 1000)
      })
      
    } catch (error) {
      console.error('❌ Error procesando payload Dinelco:', error)
      this.setState({
        error: `Error procesando datos de pago: ${error instanceof Error ? error.message : 'Unknown error'}`,
        loading: false
      })
    }
  }

  submitDinelcoForm = () => {
    if (this.formRef.current) {
      console.log('📤 Enviando formulario a Dinelco...')
      this.formRef.current.submit()
    }
  }

  handleDinelcoMessage = (event: MessageEvent) => {
    const { dinelcoData } = this.state
    
    if (!dinelcoData) return
    

    const validOrigins = [
      'https://dev-sgwf-01.bepsa.com.py',
      'https://checkout.dinelco.com.py'
    ]
    
    if (!validOrigins.includes(event.origin)) {
      console.warn('❌ Origen postMessage no válido:', event.origin)
      return
    }
    
    console.log('📨 Mensaje de Dinelco recibido:', event.data)
    
    const data = event.data
    

    if (!data || typeof data.paymentStatus !== 'string') {
      console.warn('⚠️ Mensaje de Dinelco sin paymentStatus válido:', data)
      return
    }
    

    switch (data.paymentStatus) {
      case 'payment.success':
        console.log('✅ Pago exitoso en Dinelco')
        this.respondTransaction(true)
        break
        
      case 'payment.failed':
      case 'payment.error':
        console.log('❌ Pago fallido en Dinelco')
        this.respondTransaction(false)
        break
        
      case 'payment.cancelled':
        console.log('🚫 Pago cancelado en Dinelco')
        this.respondTransaction(false)
        break
        
      default:
        console.log('📋 Estado intermedio de Dinelco:', data.paymentStatus)
        break
    }
  }

  respondTransaction = (success: boolean) => {
    console.log(`🎬 Finalizando transacción - Éxito: ${success}`)
    

    window.$(window).trigger('transactionValidation.vtex', [success])
  }

  cancelTransaction = () => {
    console.log('🚫 Usuario canceló el pago')
    this.respondTransaction(false)
  }

  render() {
    const { loading, error, dinelcoData } = this.state

    if (loading) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <h3>Inicializando Dinelco...</h3>
            <p>Preparando formulario de pago seguro</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.errorContainer}>
            <h3>❌ Error</h3>
            <p>{error}</p>
            <button 
              className={styles.buttonDanger}
              onClick={this.cancelTransaction}>
              Volver al checkout
            </button>
          </div>
        </div>
      )
    }

    if (!dinelcoData) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.errorContainer}>
            <h3>❌ Error</h3>
            <p>No se recibieron datos de Dinelco</p>
            <button 
              className={styles.buttonDanger}
              onClick={this.cancelTransaction}>
              Volver al checkout
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>🛡️ Dinelco Checkout Seguro</h2>
          <p>Procesando tu pago de forma segura</p>
          <div className={styles.paymentInfo}>
            <strong>Monto:</strong> {dinelcoData.currency} {dinelcoData.amount.toLocaleString()}
          </div>
        </div>

        <div className={styles.iframeContainer}>
          {/* Iframe donde se carga Dinelco */}
          <iframe
            ref={this.iframeRef}
            name="dinelcoCheckout"
            className={styles.dinelcoIframe}
            title="Dinelco Checkout Seguro"
            src="about:blank"
          />
          
          {/* Formulario oculto para enviar token a Dinelco */}
          <form
            ref={this.formRef}
            method="POST"
            target="dinelcoCheckout"
            action={dinelcoData.validateUrl}
            style={{ display: 'none' }}>
            <input type="hidden" name="JWT" value={dinelcoData.token} />
          </form>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.buttonDanger}
            onClick={this.cancelTransaction}>
            ❌ Cancelar Pago
          </button>
        </div>
      </div>
    )
  }
}

export default DinelcoPaymentApp
