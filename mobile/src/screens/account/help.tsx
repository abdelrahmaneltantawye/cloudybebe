import { useState } from 'react';
import { Linking } from 'react-native';
import { Button, Copy, Title } from '@/components/ui';
import { errorMessage } from '@/lib/mobile-api';
import { Card, Feedback, Page, RouteButton, websiteRoute } from '@/screens/account/shared';

export default function HelpScreen() {
  const [error, setError] = useState('');
  async function open(url: string) { setError(''); try { await Linking.openURL(url); } catch (failure) { setError(errorMessage(failure)); } }
  return <Page title="Help & contact" subtitle="A little help when you need it."><Card><Title>Contact CloudyBebe</Title><Copy selectable>sales@cloudybebe.com</Copy><Button label="Email customer care" onPress={() => void open('mailto:sales@cloudybebe.com')} secondary /><Copy selectable>+1 (307) 500-1438</Copy><Button label="Call CloudyBebe" onPress={() => void open('tel:+13075001438')} secondary /><Feedback error={error} /></Card><Card><Title>Delivery & returns</Title><RouteButton label="Shipping information" path={websiteRoute('/shipping-details/', 'Shipping information')} secondary /><RouteButton label="Returns policy" path={websiteRoute('/refund_returns/', 'Returns policy')} secondary /><RouteButton label="Privacy policy" path={websiteRoute('/privacy-policy/', 'Privacy policy')} secondary /></Card></Page>;
}
