import React from 'react';
import PropTypes from 'prop-types';
import LinearGradient from 'react-native-linear-gradient'

import {
  StyleSheet,
  PanResponder,
  View,
  Platform,
  I18nManager,
  Text
} from 'react-native';

import DefaultMarker from './DefaultMarker';
import { createArray, valueToPosition, positionToValue } from './converters';

const ViewPropTypes = require('react-native').ViewPropTypes || View.propTypes;

export default class MultiSlider extends React.Component {
  static propTypes = {
    values: PropTypes.arrayOf(PropTypes.number),
    onValuesChangeStart: PropTypes.func,
    onValuesChange: PropTypes.func,
    onValuesChangeFinish: PropTypes.func,
    sliderLength: PropTypes.number,
    touchDimensions: PropTypes.object,
    customMarker: PropTypes.func,
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    optionsArray: PropTypes.array,
    containerStyle: ViewPropTypes.style,
    trackStyle: ViewPropTypes.style,
    selectedStyle: ViewPropTypes.style,
    unselectedStyle: ViewPropTypes.style,
    markerContainerStyle: ViewPropTypes.style,
    markerStyle: ViewPropTypes.style,
    pressedMarkerStyle: ViewPropTypes.style,
    valuePrefix: PropTypes.string,
    valueSuffix: PropTypes.string,
    enabledOne: PropTypes.bool,
    onToggleOne: PropTypes.func,
    allowOverlap: PropTypes.bool,
    snapped: PropTypes.bool,
    markerOffsetX: PropTypes.number,
    markerOffsetY: PropTypes.number,
    vertical: PropTypes.bool,
    inverted: PropTypes.bool,
    indicators: PropTypes.array,
    unit: PropTypes.string
  };

  static defaultProps = {
    values: [0],
    onValuesChangeStart: () => {
    },
    onValuesChange: values => {
    },
    onValuesChangeFinish: values => {
    },
    step: 1,
    min: 0,
    max: 10,
    touchDimensions: {
      height: 50,
      width: 50,
      borderRadius: 15,
      slipDisplacement: 200,
    },
    customMarker: DefaultMarker,
    markerOffsetX: 0,
    markerOffsetY: 0,
    sliderLength: 280,
    onToggleOne: undefined,
    enabledOne: true,
    allowOverlap: false,
    snapped: false,
    vertical: false,
    inverted: false,
  };

  constructor(props) {
    super(props);
    this.optionsArray = this.props.optionsArray ||
      createArray(this.props.min, this.props.max, this.props.step);
    this.stepLength = this.props.sliderLength / this.optionsArray.length;
    var initialValues = this.props.values.map(value =>
      valueToPosition(value, this.optionsArray, this.props.sliderLength));
    this.state = {
      pressedOne: true,
      valueOne: this.props.values[0],
      valueTwo: this.props.values[1],
      pastOne: initialValues[0],
      positionOne: initialValues[0],
      positionTwo: initialValues[1],
    };
  }

  componentWillMount() {
    var customPanResponder = (start, move, end) => {
      return PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => start(),
        onPanResponderMove: (evt, gestureState) => move(gestureState),
        onPanResponderTerminationRequest: (evt, gestureState) => false,
        onPanResponderRelease: (evt, gestureState) => end(gestureState),
        onPanResponderTerminate: (evt, gestureState) => end(gestureState),
        onShouldBlockNativeResponder: (evt, gestureState) => true,
      });
    };

    this._panResponderOne = customPanResponder(
      this.startOne,
      this.moveOne,
      this.endOne,
    );
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.onePressed || this.state.twoPressed) {
      return;
    }

    let nextState = {};
    if (nextProps.min !== this.props.min ||
      nextProps.max !== this.props.max ||
      nextProps.values[0] !== this.state.valueOne ||
      nextProps.sliderLength !== this.props.sliderLength ||
      nextProps.values[1] !== this.state.valueTwo ||
      (nextProps.sliderLength !== this.props.sliderLength &&
        nextProps.values[1])
    ) {
      this.optionsArray = this.props.optionsArray ||
        createArray(nextProps.min, nextProps.max, nextProps.step);

      this.stepLength = this.props.sliderLength / this.optionsArray.length;

      var positionOne = valueToPosition(
        nextProps.values[0],
        this.optionsArray,
        nextProps.sliderLength,
      );
      nextState.valueOne = nextProps.values[0];
      nextState.pastOne = positionOne;
      nextState.positionOne = positionOne;

      var positionTwo = valueToPosition(
        nextProps.values[1],
        this.optionsArray,
        nextProps.sliderLength,
      );
      nextState.valueTwo = nextProps.values[1];
      nextState.positionTwo = positionTwo;
    }

    if (nextState != {}) {
      this.setState(nextState);
    }
  }

  startOne = () => {
    if (this.props.enabledOne) {
      this.props.onValuesChangeStart();
      this.setState({
        onePressed: !this.state.onePressed,
      });
    }
  };

  moveOne = (gestureState) => {
    if (!this.props.enabledOne) {
      return;
    }

    const accumDistance = this.props.vertical ? -gestureState.dy : gestureState.dx;
    const accumDistanceDisplacement = this.props.vertical ? gestureState.dx : gestureState.dy;
    const unconfined = I18nManager.isRTL ? this.state.pastOne - accumDistance : accumDistance + this.state.pastOne;
    var bottom = 0;
    var trueTop = this.state.positionTwo - (this.props.allowOverlap ? 0 : this.stepLength);
    var top = trueTop === 0 ? 0 : trueTop || this.props.sliderLength;
    var confined = unconfined < bottom
      ? bottom
      : unconfined > top ? top : unconfined;
    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    if (Math.abs(accumDistanceDisplacement) < slipDisplacement || !slipDisplacement) {
      var value = positionToValue( confined, this.optionsArray, this.props.sliderLength,);
      var snapped = valueToPosition(value, this.optionsArray, this.props.sliderLength,);
      this.setState({positionOne: this.props.snapped ? snapped : confined,});
      if (value !== this.state.valueOne) {
        this.setState({valueOne: value,},() => {
            var change = this.state.valueOne;
            this.props.onValuesChange(change, gestureState);
          },
        );
      }
    }
  };

  endOne = gestureState => {
    if (gestureState.moveX === 0 && this.props.onToggleOne) {
      this.props.onToggleOne();
      return;
    }
    this.setState({ pastOne: this.state.positionOne,onePressed: !this.state.onePressed,},() => {
        var change = [this.state.valueOne];
        if (this.state.valueTwo) {
          change.push(this.state.valueTwo);
        }
        this.props.onValuesChangeFinish(change, gestureState);
      },
    );
  };

  render() {
    const { positionOne } = this.state;
    const { selectedStyle, unselectedStyle, sliderLength, markerOffsetX, markerOffsetY } = this.props;
    const twoMarkers = this.props.values.length == 2;   // when allowOverlap, positionTwo could be 0, identified as string '0' and throwing 'RawText 0 needs to be wrapped in <Text>' error
    const trackOneLength = positionOne;
    const trackOneStyle = twoMarkers ? unselectedStyle : selectedStyle || styles.selectedTrack;
    const trackTwoLength = sliderLength - trackOneLength - 0;
    const trackTwoStyle = twoMarkers ? selectedStyle || styles.selectedTrack : unselectedStyle;
    const Marker = this.props.customMarker;
    const { borderRadius,} = this.props.touchDimensions;
    const touchStyle = { borderRadius: borderRadius || 0, };
    const markerContainerOne = { top: markerOffsetY - 24, left: trackOneLength + markerOffsetX - 24 }
    const containerStyle = [styles.constainerStyle, {width:sliderLength}];
    if (this.props.vertical) {
      containerStyle.push({transform: [{ rotate: this.props.inverted ? '90deg' : '-90deg' }],})
    }

    let textGridRangeLabel = []
    let viewHorizontalSeparator = []
    const indicators = this.props.indicators.slice().reverse()
    for(let index = 0; index < indicators.length ; index++) {
      if(index === 0) {
        textGridRangeLabel.push(<Text key={index} style={[styles.textSliderGridText, { top: -0}]}>{indicators[index]} {this.props.unit} </Text>)
      } else {
        const step = sliderLength/(this.props.indicators.length-1)
        textGridRangeLabel.push(<Text key={index} style={[styles.textSliderGridText, { top: index*step - 0}]}>{indicators[index]} {'€'} </Text>)
        viewHorizontalSeparator.push(<View key={index} style={[styles.separatorSliderGridView, {top: index*step - step/2 + 24, 
          backgroundColor: (sliderLength - (index*step - step/2)) < trackOneLength ? '#ff9933' : 'rgba(220,220,220,0.7)' }]}></View>)
      }
    }

    return (
      <View style={[styles.overlay, { height:sliderLength + 24 + 20} ]}>
      <LinearGradient style={[styles.linearGradient, {height: trackOneLength}]} colors={['rgba(245,224,177,1.0)', 'rgba(245,224,177,0.8)', 'rgba(245,224,177,0.1)']} />
      {viewHorizontalSeparator}
       <View ref={component => this._markerOne = component}{...this._panResponderOne.panHandlers} style={styles.gridContainer}>
          <View style={{flex:1}}></View>
          <View style={[containerStyle]}>
            <View style={[styles.fullTrack, { width: sliderLength + 24 + 20 }]}>
              <View style={[styles.track, this.props.trackStyle, trackOneStyle, { width: trackOneLength+10 }]}/>
              <View style={[styles.track, this.props.trackStyle, trackTwoStyle,{ width: trackTwoLength+10 }]}/>
                <View style={[styles.markerContainer, markerContainerOne, this.props.markerContainerStyle,positionOne > sliderLength / 2 && styles.topMarkerContainer ]}>
                <View style={[styles.touch, touchStyle]}>
                  <Marker
                    enabled={this.props.enabledOne}
                    pressed={this.state.onePressed}
                    markerStyle={[styles.marker, this.props.markerStyle]}
                    pressedMarkerStyle={this.props.pressedMarkerStyle}
                    currentValue={this.state.valueOne}
                    valuePrefix={this.props.valuePrefix}
                    valueSuffix={this.props.valueSuffix}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={{flex:1, height: sliderLength}}>
            {textGridRangeLabel}
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  constainerStyle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flex:1,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginVertical: 0
  },
  fullTrack: {
    flexDirection: 'row',
  },
  track: {
    ...Platform.select({
      ios: {
        height: 2,
        borderRadius: 2,
        backgroundColor: '#A7A7A7',
      },
      android: {
        height: 2,
        backgroundColor: '#CECECE',
      },
    }),
  },
  selectedTrack: {
    ...Platform.select({
      ios: {
        backgroundColor: '#095FFF',
      },
      android: {
        backgroundColor: '#0D8675',
      },
    }),
  },
  markerContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topMarkerContainer: {
    zIndex: 1,
  },
  touch: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  textSliderGridText: {
    position: 'absolute',
    left: -50,
    width: 100,
    height: 20,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#ff9933'
  },
  separatorSliderGridView: {
    width: 100, 
    height: 0.8,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  linearGradient: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  }  
});
