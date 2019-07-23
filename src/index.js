import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Button, Note } from '@contentful/forma-36-react-components';
import { init, locations } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';

export class SidebarExtension extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      valid: true
    };
  }

  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  componentDidMount() {
    this.props.sdk.window.startAutoResizer();
    this.validateAll();
    this.bindChanges();
  }

  bindChanges = () => {
    Object.keys(this.props.sdk.entry.fields).forEach(k => {
      this.props.sdk.entry.fields[k].onValueChanged(this.validateAll)
    })
  }

  buildSizeValidation = (validation) => {
    return v => {
      if (validation.size.min && validation.size.max) {
        return validation.size.min <= v.length && validation.size.max >= v.length
      } else if (validation.size.min) {
        return validation.size.min <= v.length
      } else if (validation.size.max) {
        return validation.size.max >= v.length
      } else {
        return true
      }
    }
  }

  buildProhibitRegexValidation = (validation) => {
    return v => {
      return !new RegExp(
        validation.prohibitRegexp.pattern,
        validation.prohibitRegexp.flags ? validation.prohibitRegexp.flags : ''
      ).test(v)
    }
  }

  stringValidations = {
    unique: () => () => true, // building the uniqueness validation is a bit tricky so we skip it for now
    size: validation => this.buildSizeValidation(validation),
    prohibitRegexp: validation => this.buildProhibitRegexValidation(validation)
  }

  buildStringValidations = (validationDefinitions) => {
    let validations = []

    validationDefinitions.forEach(validation => {
      Object.keys(this.stringValidations).forEach(k => {
        if (Object.prototype.hasOwnProperty.call(validation, k)) {
          validations.push(this.stringValidations[k](validation))
        }
      })
    })
    return validations
  }

  buildRangeValidation = (validation) => {
    return v => {
      if (validation.range.min && validation.range.max) {
        return validation.range.min <= v && validation.range.max >= v
      } else if (validation.range.min) {
        return validation.range.min <= v
      } else if (validation.range.max) {
        return validation.range.max >= v
      } else {
        return true
      }
    }
  }

  numberValidations = {
    range: (validation) => this.buildRangeValidation(validation)
  }

  buildNumberValidations = (validationDefinitions) => {
    let validations = []

    validationDefinitions.forEach(validation => {
      Object.keys(this.numberValidations).forEach(k => {
        if (Object.prototype.hasOwnProperty.call(validation, k)) {
          validations.push(this.numberValidations[k](validation))
        }
      })
    })

    return validations
  }

  buildSharedValidations = (field) => {
    let validations = []

    if (field.required) {
      validations.push(
        v => v !== null
      )
    }

    return validations
  }

  buildValidations = (field) => {
    let validations = []

    if (field.type === "Symbol" || field.type === "Text") {
      validations = validations.concat(this.buildStringValidations(field.validations))
    } else if (field.type === "Integer" || field.type === "Float") {
      validations = validations.concat(this.buildNumberValidations(field.validations))
    }
    validations = validations.concat(this.buildSharedValidations(field))

    return validations.flat();
  }

  buildAllValidations = () => {
    let validations = {}
    Object.keys(this.props.sdk.contentType.fields).forEach(k => {
      let field = this.props.sdk.contentType.fields[k];
      validations[field.id] = this.buildValidations(field);
    })

    return validations;
  }

  validateField = (field, validations) => {
    let fieldValue = this.props.sdk.entry.fields[field.id].getValue();

    if (validations.length === 0) return true
    return validations.map(validation => validation(fieldValue)).every(valid => !!valid);
  }

  validateAll = () => {
    const validations = this.buildAllValidations()

    let valid = Object.keys(this.props.sdk.contentType.fields).map(k => {
      let field = this.props.sdk.contentType.fields[k];
      return this.validateField(field, validations[field.id])
    }).every(v => !!v);
    this.setState(() => ({valid: valid}));
  };

  render() {
    return (
      <>
        <Button
          buttonType="positive"
          isFullWidth={true}
          testId="validate"
          onClick={this.validateAll}>
          Validate
        </Button>
        <ValidationMessages valid={this.state.valid} />
      </>
    );
  }
}

export class ValidationMessages extends React.Component {
  static propTypes = {
    valid: PropTypes.bool.isRequired
  };

  render() {
    return (
      <Note noteType={this.props.valid ? "positive" : "negative"}>
        {
          this.props.valid ?
            "All is good! You can publish." :
            "There are some errors in your fields."
        }
      </Note>
    );
  }
}

export const initialize = sdk => {
  if (sdk.location.is(locations.LOCATION_ENTRY_SIDEBAR)) {
    ReactDOM.render(<SidebarExtension sdk={sdk} />, document.getElementById('root'));
  }
};

init(initialize);

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
