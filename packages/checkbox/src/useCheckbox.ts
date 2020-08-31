import {
  ref,
  computed,
  inject,
  getCurrentInstance,
  onMounted,
  watch,
} from 'vue'
import { toTypeString } from '@vue/shared'
import { UPDATE_MODEL_EVENT } from '@element-plus/utils/constants'
import { ICheckboxGroupInstance, ICheckboxProps, IArgs } from './checkbox'

export const useCheckboxGroup = () => {
  //todo: ELEMENT
  const ELEMENT = null
  const elForm = inject('elForm', {})
  const elFormItem = inject('elFormItem', {}) as any
  const checkboxGroup = inject<ICheckboxGroupInstance>('CheckboxGroup', {})
  const isGroup = computed(() => checkboxGroup && checkboxGroup.name === 'ElCheckboxGroup')
  const elFormItemSize = computed(() => {
    return (elFormItem || {} as any).elFormItemSize
  })
  return {
    isGroup,
    checkboxGroup,
    elForm,
    ELEMENT,
    elFormItemSize,
    elFormItem,
  }
}

const useModel = (props: ICheckboxProps) => {
  let selfModel = false
  const { emit } = getCurrentInstance()
  const { isGroup, checkboxGroup } = useCheckboxGroup()
  const isLimitExceeded = ref(false)
  const store = computed(() => checkboxGroup ? checkboxGroup.modelValue.value : props.modelValue)
  const model = computed({
    get() {
      return isGroup.value ? store.value : props.modelValue !== undefined ? props.modelValue : selfModel
    },

    set(val: unknown) {
      if (isGroup.value && Array.isArray(val)) {
        isLimitExceeded.value = false

        if (checkboxGroup.min !== undefined && val.length < checkboxGroup.min) {
          isLimitExceeded.value = true
        }
        if (checkboxGroup.max !== undefined && val.length > checkboxGroup.max) {
          isLimitExceeded.value = true
        }

        isLimitExceeded.value === false && checkboxGroup.changeEvent?.(val)
      } else {
        emit(UPDATE_MODEL_EVENT, val)
        selfModel = val as boolean
      }
    },
  })

  return {
    model,
    isLimitExceeded,
  }
}

const useCheckboxStatus = (props: ICheckboxProps, { model }: IArgs<typeof useModel>) => {
  const { isGroup, checkboxGroup, elFormItemSize, ELEMENT } = useCheckboxGroup()
  const focus = ref(false)
  const size = computed<string|undefined>(() => checkboxGroup.checkboxGroupSize || elFormItemSize || (ELEMENT || {}).size)
  const isChecked = computed(() => {
    const value = model.value
    if (toTypeString(value) === '[object Boolean]') {
      return Boolean(value)
    } else if (Array.isArray(value)) {
      return value.includes(props.label)
    } else if (value !== null && value !== undefined) {
      return value === props.trueLabel
    }
  })
  const checkboxSize = computed(() => {
    const temCheckboxSize = props.size || elFormItemSize.value || (ELEMENT || {} as any).size
    return isGroup.value
      ? checkboxGroup.checkboxGroupSize || temCheckboxSize
      : temCheckboxSize
  })

  return {
    isChecked,
    focus,
    size,
    checkboxSize,
  }
}

const useDisabled = (
  props: ICheckboxProps,
  { model, isChecked }: IArgs<typeof useModel> & IArgs<typeof useCheckboxStatus>,
) => {
  const { elForm, isGroup, checkboxGroup } = useCheckboxGroup()
  const isLimitDisabled = computed(() => {
    const max = checkboxGroup.max
    const min = checkboxGroup.min
    return !!(max || min) && (model.value.length >= max && !isChecked.value) ||
      (model.value.length <= min && isChecked.value)
  })
  const isDisabled = computed(() => {
    return isGroup.value
      ? checkboxGroup.disabled || props.disabled ||  (elForm as any || {} as any).disabled || isLimitDisabled.value
      : props.disabled || (elForm as any || {} as any).disabled
  })

  return {
    isDisabled,
    isLimitDisabled,
  }
}

const setStoreValue = (props: ICheckboxProps, { model }: IArgs<typeof useModel>) => {
  function addToStore() {
    if (
      Array.isArray(model.value) &&
      !model.value.includes(props.label)
    ) {
      model.value.push(props.label)
    } else {
      model.value = props.trueLabel || true
    }
  }
  props.checked && addToStore()
}

const useEvent = (props: ICheckboxProps, { isLimitExceeded }: IArgs<typeof useModel>) => {
  const { elFormItem } = useCheckboxGroup()
  const { emit } = getCurrentInstance()
  function handleChange(e: InputEvent) {
    if (isLimitExceeded.value) return
    const target = e.target as HTMLInputElement
    const value = target.checked
      ? props.trueLabel ?? true
      : props.falseLabel ?? false

    emit('change', value, e)
  }

  watch(() => props.modelValue, val => {
    elFormItem.changeEvent?.(val)
  })

  return {
    handleChange,
  }
}

export const setAria = (props: ICheckboxProps) => {
  const instance = getCurrentInstance()
  onMounted(() => {
    instance.vnode.el.setAttribute('aria-controls', props.controls)
  })
}

export const useCheckbox = (props: ICheckboxProps) => {
  const instance = getCurrentInstance()
  const { model, isLimitExceeded } = useModel(props)
  const { focus, size, isChecked, checkboxSize } = useCheckboxStatus(props, { model })
  const { isDisabled } = useDisabled(props, { model, isChecked })
  const { handleChange } = useEvent(props, { isLimitExceeded })

  setStoreValue(props, { model })

  return {
    instance,
    isChecked,
    isDisabled,
    checkboxSize,
    model,
    handleChange,
    focus,
    size,
  }
}
